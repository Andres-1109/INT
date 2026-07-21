/*
  FILE: src/controllers/bookingsController.ts

  What does this file do?
  Handles the full booking lifecycle. The business logic (fees, VAT,
  and above all making sure two bookings never overlap) is calculated
  here, on the server, and the overlap check is a real query against
  both existing bookings AND the space's manual blocks.

  Merge note — overlap validation bug fixed: the original Daniel repo's
  Reservation model only stored a "startTime" with no "endTime", so it
  physically could not compare against the end of an existing booking.
  This model stores both start and end, and the overlap check compares
  both ends of the range, exactly like María's raw-SQL version did.

  Merge note — "first hour free": the welcome pop-up in the frontend
  (welcomeModal.js) promises "book today and get your first hour free",
  and the User model already had a freeBookingsUsed counter for it, but
  neither original repo actually wired that promise into the price
  calculation. This fills that gap: a user's very first booking gets
  one hour deducted from the base price. If the team intended something
  different (e.g. the whole first booking free, not just one hour),
  this is the one function to adjust: applyFirstBookingDiscount below.

  Business rule changed 2026-07-19 (confirmed with the team): payment is
  now mandatory and happens as part of createBooking itself — a Booking
  row is never created unless the simulated payment succeeds first. This
  replaced the old standalone POST /api/payments/simulate endpoint,
  which let a guest pay (and thus auto-confirm) a booking the host had
  never approved, contradicting the "every request needs host approval"
  rule — see docs/resolved-bugs.md, bug #7. The host's approve/reject
  step is untouched: paying only guarantees the money is captured, it
  does NOT skip pending_approval. And a host who rejects an already-paid
  booking does not trigger any refund — the rejected booking simply
  keeps its paymentReference visible to the guest (see myBookings.js),
  who can request a manual refund by contacting support. That's an
  intentional simplification, not a gap to fix later without asking.
*/

import type { Request, Response, NextFunction } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { notify } from './notificationsController.js';
import type { CreateBookingInput } from '../validators/bookingValidators.js';

const GUEST_FEE_RATE = 0.12;
const HOST_FEE_RATE = 0.06;
const TAX_RATE = 0.19;
const RESPONSE_WINDOW_HOURS = 24;
const GUEST_CANCEL_MIN_HOURS_BEFORE = 12;
const HOST_LATE_CANCEL_WINDOW_HOURS = 24;
const HOST_LATE_CANCEL_PENALTY_RATE = 0.20;
const HOST_LATE_CANCEL_COMPENSATION_RATE = 0.10;

function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function applyFirstBookingDiscount(basePrice: number, pricePerHour: number, isFirstBooking: boolean) {
  if (!isFirstBooking) return basePrice;
  return Math.max(0, basePrice - pricePerHour);
}

// Simulated payment gateway (still no real integration — see
// docs/GUIDE.md). Used to be its own endpoint (POST /api/payments/simulate)
// the guest called after the fact; now it runs inline as part of
// createBooking, since payment is mandatory to reserve at all. Same 95%
// approval rate a real gateway would have.
function simulatePaymentAttempt(): { approved: boolean; reference: string } {
  const approved = Math.random() > 0.05;
  return { approved, reference: `WSP-${Date.now()}` };
}

// Combines a "date" (always UTC midnight — it comes from new Date() on a
// "YYYY-MM-DD" string, which the JS spec always parses as UTC) with an
// "HH:MM" time into a single instant. Uses setUTCHours, NOT setHours:
// setHours reads/writes the LOCAL calendar day of the Date object, which
// for a UTC-midnight instant is the PREVIOUS day in any timezone west of
// UTC (e.g. America/Bogota, UTC-5) — silently shifting every booking a
// full day backwards wherever the backend process happens to run. WSPACE
// only operates in one timezone (see the business rules table), so this
// must never depend on the server's local timezone setting.
function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setUTCHours(h, m, 0, 0);
  return combined;
}

const BOOKING_INCLUDE = {
  space: { select: { id: true, name: true, ownerId: true, pricePerHour: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  // Lightweight — only used to tell the frontend whether "leave a
  // review" should still be offered for this booking (see HU-23,
  // reviewsController.createReview enforces one review per booking).
  review: { select: { id: true } }
} as const;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

function mapBooking(booking: BookingWithRelations) {
  return {
    id: booking.id,
    spaceId: booking.spaceId,
    spaceName: booking.space.name,
    guestId: booking.userId,
    guestName: `${booking.user.firstName} ${booking.user.lastName}`,
    hostId: booking.space.ownerId,
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    endTime: booking.endTime,
    basePrice: Number(booking.basePrice),
    guestFee: Number(booking.guestFee),
    guestFeeTax: Number(booking.guestFeeTax),
    total: Number(booking.total),
    hostNet: Number(booking.hostNet),
    status: booking.status,
    responseDeadline: booking.responseDeadline,
    paymentReference: booking.paymentReference,
    hasReview: Boolean(booking.review)
  };
}

// POST /api/bookings
export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { spaceId, date, startTime, endTime } = req.body as CreateBookingInput;

    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw AppError.notFound('Espacio no encontrado');

    const hours = hoursBetween(startTime, endTime);
    if (hours <= 0) throw AppError.badRequest('El horario seleccionado no es válido');

    const bookingDate = new Date(date);
    const newStart = combineDateAndTime(bookingDate, startTime);
    const newEnd = combineDateAndTime(bookingDate, endTime);

    // Overlap check #1: existing bookings for this space that are still
    // active (pending or confirmed). Compares BOTH ends of the range —
    // this is the exact check that was missing an end-time comparison
    // in the original Daniel repo.
    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        spaceId,
        date: bookingDate,
        status: { in: ['pending_approval', 'confirmed'] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ]
      }
    });
    if (overlappingBooking) {
      throw AppError.conflict('Ese horario ya no está disponible, elige otro');
    }

    // Overlap check #2: manual blocks the host set on the space
    const overlappingBlock = await prisma.spaceBlock.findFirst({
      where: {
        spaceId,
        startDate: { lt: newEnd },
        endDate: { gt: newStart }
      }
    });
    if (overlappingBlock) {
      throw AppError.conflict('El anfitrión bloqueó ese horario');
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw AppError.unauthorized('No autenticado');

    const isFirstBooking = user.freeBookingsUsed === 0;
    const pricePerHour = Number(space.pricePerHour);
    const rawBasePrice = pricePerHour * hours;
    const basePrice = applyFirstBookingDiscount(rawBasePrice, pricePerHour, isFirstBooking);

    const guestFee = basePrice * GUEST_FEE_RATE;
    const guestFeeTax = guestFee * TAX_RATE;
    const total = basePrice + guestFee + guestFeeTax;

    const hostFee = basePrice * HOST_FEE_RATE;
    const hostFeeTax = hostFee * TAX_RATE;
    const hostNet = basePrice - hostFee - hostFeeTax;

    const responseDeadline = new Date(Date.now() + RESPONSE_WINDOW_HOURS * 60 * 60 * 1000);

    // Payment is mandatory to reserve at all — nothing gets created if
    // this fails, so there's never a booking without a captured payment.
    const payment = simulatePaymentAttempt();
    if (!payment.approved) {
      throw new AppError('El pago fue rechazado, intenta con otro método', 402);
    }

    const booking = await prisma.booking.create({
      data: {
        spaceId,
        userId: req.user!.id,
        date: bookingDate,
        startTime,
        endTime,
        basePrice,
        guestFee,
        guestFeeTax,
        hostFee,
        hostFeeTax,
        total,
        hostNet,
        usedFreeBooking: isFirstBooking,
        status: 'pending_approval',
        responseDeadline,
        paymentReference: payment.reference
      },
      include: BOOKING_INCLUDE
    });

    if (isFirstBooking) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { freeBookingsUsed: { increment: 1 } }
      });
    }

    await notify(space.ownerId, 'booking_requested', `Tu espacio "${space.name}" recibió una nueva solicitud de reserva`);

    res.status(201).json(mapBooking(booking));
  } catch (error) {
    next(error);
  }
}

// GET /api/bookings/mine — bookings the current user made as a guest
export async function getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings.map(mapBooking));
  } catch (error) {
    next(error);
  }
}

// GET /api/bookings/host — booking requests received on the current
// user's own spaces
export async function getHostBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookings = await prisma.booking.findMany({
      where: { space: { ownerId: req.user!.id } },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings.map(mapBooking));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/bookings/:id/respond — the host approves or rejects a
// pending request
export async function respondBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body as { status: 'confirmed' | 'rejected' };

    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { space: true } });
    if (!booking) throw AppError.notFound('Reserva no encontrada');
    if (booking.space.ownerId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta reserva');
    if (booking.status !== 'pending_approval') {
      throw AppError.badRequest('Esta solicitud ya fue respondida y no se puede volver a cambiar');
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: BOOKING_INCLUDE
    });

    await notify(
      updated.userId,
      status === 'confirmed' ? 'booking_confirmed' : 'booking_rejected',
      status === 'confirmed'
        ? `Tu solicitud para "${updated.space.name}" fue confirmada`
        : `Tu solicitud para "${updated.space.name}" fue rechazada`
    );

    res.json(mapBooking(updated));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/bookings/:id/cancel — the guest cancels their own booking.
// Not allowed less than 12 hours before the booking starts.
export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Reserva no encontrada');
    if (booking.userId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta reserva');

    const bookingStart = combineDateAndTime(booking.date, booking.startTime);
    const hoursUntilStart = (bookingStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilStart < GUEST_CANCEL_MIN_HOURS_BEFORE) {
      throw AppError.badRequest(
        `No puedes cancelar con menos de ${GUEST_CANCEL_MIN_HOURS_BEFORE} horas de anticipación`
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled_by_guest' },
      include: BOOKING_INCLUDE
    });

    await notify(updated.space.ownerId, 'booking_cancelled', `El WSpacer canceló su reserva en "${updated.space.name}"`);

    res.json(mapBooking(updated));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/bookings/:id/host-cancel — the host cancels a booking they
// had already confirmed. If it's less than 24h before the booking
// starts, the host is charged a 20% penalty and the guest is
// compensated 10%, both logged in BookingPenalty.
export async function hostCancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { space: true } });
    if (!booking) throw AppError.notFound('Reserva no encontrada');
    if (booking.space.ownerId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta reserva');

    const bookingStart = combineDateAndTime(booking.date, booking.startTime);
    const hoursUntilStart = (bookingStart.getTime() - Date.now()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilStart < HOST_LATE_CANCEL_WINDOW_HOURS;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'cancelled_by_host' },
        include: BOOKING_INCLUDE
      });

      if (isLateCancellation) {
        const total = Number(booking.total);
        await tx.bookingPenalty.createMany({
          data: [
            { bookingId, type: 'host_penalty', amount: total * HOST_LATE_CANCEL_PENALTY_RATE },
            { bookingId, type: 'guest_compensation', amount: total * HOST_LATE_CANCEL_COMPENSATION_RATE }
          ]
        });
      }

      return result;
    });

    await notify(updated.userId, 'booking_cancelled', `Tu reserva en "${updated.space.name}" fue cancelada por el anfitrión`);

    res.json({ ...mapBooking(updated), latePenaltyApplied: isLateCancellation });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/bookings/:id/complete — the host manually marks a booking
// as fulfilled once it has actually taken place. Nothing else in the
// system ever moves a booking into "completed" on its own (no cron job,
// no automatic transition), so this is the one place that feeds the
// host's income metric on the dashboard (see dashboard.js).
export async function completeBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { space: true } });
    if (!booking) throw AppError.notFound('Reserva no encontrada');
    if (booking.space.ownerId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta reserva');
    if (booking.status !== 'confirmed') {
      throw AppError.badRequest('Solo se puede marcar como cumplida una reserva confirmada');
    }

    const bookingEnd = combineDateAndTime(booking.date, booking.endTime);
    if (bookingEnd.getTime() > Date.now()) {
      throw AppError.badRequest('No puedes marcar como cumplida una reserva que todavía no ha terminado');
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'completed' },
      include: BOOKING_INCLUDE
    });

    res.json(mapBooking(updated));
  } catch (error) {
    next(error);
  }
}
