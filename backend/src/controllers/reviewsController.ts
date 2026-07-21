/*
  FILE: src/controllers/reviewsController.ts

  What does this file do?
  Lets a WSpacer leave a rating + optional comment on a booking once it's
  completed (see bookingsController.completeBooking), and lets a
  WSpacer+ see every review left on any of their spaces (HU-23).

  Note: the original backlog only documented the host-facing side of
  this ("HU-23 — Ver reseñas recibidas"). There was no separate story for
  the guest leaving one, but without a way to create a review, HU-23
  could never show anything real — so createReview() is the minimal
  piece needed to make HU-23 actually work end to end, the same way
  blocksController needed create/list/delete, not just "list", for
  HU-17 to be meaningful.
*/

import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateReviewInput } from '../validators/reviewValidators.js';

// POST /api/bookings/:id/review — the guest reviews their own completed booking
export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Number(req.params.id);
    const { rating, comment } = req.body as CreateReviewInput;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Reserva no encontrada');
    if (booking.userId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta reserva');
    if (booking.status !== 'completed') {
      throw AppError.badRequest('Solo puedes dejar una reseña sobre una reserva ya cumplida');
    }

    const existingReview = await prisma.review.findUnique({ where: { bookingId } });
    if (existingReview) throw AppError.conflict('Ya dejaste una reseña para esta reserva');

    const review = await prisma.review.create({
      data: {
        bookingId,
        spaceId: booking.spaceId,
        userId: req.user!.id,
        rating,
        comment
      }
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

// GET /api/reviews/host — every review left on any of the current user's spaces
export async function listHostReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await prisma.review.findMany({
      where: { space: { ownerId: req.user!.id } },
      include: {
        space: { select: { id: true, name: true } },
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(
      reviews.map((review) => ({
        id: review.id,
        spaceId: review.space.id,
        spaceName: review.space.name,
        guestName: `${review.user.firstName} ${review.user.lastName}`,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
}
