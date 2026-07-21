/*
  FILE: src/controllers/spacesController.ts

  What does this file do?
  Handles everything related to spaces (search, view detail, publish,
  view your own), reading and writing through Prisma.

  Merge note: photos and amenities are stored in their own relational
  tables (SpacePhoto, Amenity, SpaceAmenity), following María's
  normalized 3NF model — NOT as plain string arrays on the Space row,
  which is what the original Daniel repo did and which breaks the
  project's normalization requirement.
*/

import type { Request, Response, NextFunction } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateSpaceInput } from '../validators/spaceValidators.js';

// Exported so other controllers that also need the "flat space" shape
// (favoritesController, for the list of favorited spaces) don't have to
// duplicate this include/mapping.
export const SPACE_INCLUDE = {
  photos: true,
  amenities: { include: { amenity: true } }
} as const;

// Builds the "not already taken at this moment" part of the search
// filter. The search bar only collects a single start time (no duration
// or end time, unlike the booking form), so this checks whether the
// space is free starting exactly at that moment — not a full-range
// overlap like the one done at booking time in bookingsController.ts.
function buildAvailabilityFilter(dateParam: string, startTimeParam: string): Prisma.SpaceWhereInput {
  const bookingDate = new Date(dateParam);
  if (Number.isNaN(bookingDate.getTime())) return {};
  if (!/^\d{2}:\d{2}$/.test(startTimeParam)) return {};

  const [hours, minutes] = startTimeParam.split(':').map(Number);
  const momentToCheck = new Date(bookingDate);
  // setUTCHours, not setHours — see combineDateAndTime() in
  // bookingsController.ts for why this must not depend on the server's
  // local timezone (bookingDate is always UTC midnight; setHours would
  // read/write the local calendar day instead, shifting it by a full day
  // wherever the backend runs west of UTC).
  momentToCheck.setUTCHours(hours, minutes, 0, 0);

  return {
    bookings: {
      none: {
        date: bookingDate,
        status: { in: ['pending_approval', 'confirmed'] },
        startTime: { lte: startTimeParam },
        endTime: { gt: startTimeParam }
      }
    },
    blocks: {
      none: {
        startDate: { lte: momentToCheck },
        endDate: { gt: momentToCheck }
      }
    }
  };
}

// Exported (same reasoning as SPACE_INCLUDE above) so favoritesController
// can type its own Prisma queries to match what mapSpace() expects.
export type SpaceWithRelations = Prisma.SpaceGetPayload<{ include: typeof SPACE_INCLUDE }>;

async function findOneSpace(id: number) {
  return prisma.space.findUnique({ where: { id }, include: SPACE_INCLUDE });
}

// Converts a Prisma row (with its related photos/amenities) into the
// flat shape the frontend expects: photos as a plain array of URLs,
// amenities as a plain array of keys.
//
// active/publicationStatus/rejectionReason are included here so the
// owner-facing views (my-spaces list, edit form) can show the real
// state of a space. Public search already filters to approved+active
// spaces only, so exposing these fields there too is harmless.
export function mapSpace(space: SpaceWithRelations) {
  return {
    id: space.id,
    ownerId: space.ownerId,
    name: space.name,
    type: space.type,
    city: space.city,
    neighborhood: space.neighborhood,
    capacity: space.capacity,
    pricePerHour: Number(space.pricePerHour),
    description: space.description,
    featured: space.featured,
    active: space.active,
    publicationStatus: space.publicationStatus,
    rejectionReason: space.rejectionReason,
    photos: space.photos.map((p) => p.url),
    amenities: space.amenities.map((sa) => sa.amenity.name)
  };
}

// GET /api/spaces?city=&type=&date=&startTime=
// Public search. Only ever returns spaces the admin has approved and
// that are currently active — a space pending approval or deactivated
// by its owner must never show up here. When date+startTime are both
// given, also excludes spaces already booked or blocked at that moment.
export async function searchSpaces(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { city, type, date, startTime } = req.query;

    const spaces = await prisma.space.findMany({
      where: {
        publicationStatus: 'approved',
        active: true,
        ...(city ? { OR: [
          { city: { contains: String(city), mode: 'insensitive' } },
          { neighborhood: { contains: String(city), mode: 'insensitive' } }
        ] } : {}),
        ...(type ? { type: String(type) as never } : {}),
        ...(date && startTime ? buildAvailabilityFilter(String(date), String(startTime)) : {})
      },
      include: SPACE_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });

    res.json(spaces.map(mapSpace));
  } catch (error) {
    next(error);
  }
}

// GET /api/spaces/mine — spaces belonging to the logged-in user
export async function getMySpaces(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaces = await prisma.space.findMany({
      where: { ownerId: req.user!.id },
      include: SPACE_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });

    res.json(spaces.map(mapSpace));
  } catch (error) {
    next(error);
  }
}

// GET /api/spaces/:id
export async function getSpaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const space = await findOneSpace(Number(req.params.id));
    if (!space) throw AppError.notFound('Espacio no encontrado');

    res.json(mapSpace(space));
  } catch (error) {
    next(error);
  }
}

// POST /api/spaces — publishes a new space. Always starts as
// "pending_approval": it will not appear in public search until an
// admin approves it (see adminController.ts).
//
// Business rule confirmed 2026-07-17: publishing (even the very first
// space, which is what flips isHost to true below) requires the account
// to already have its verification documents on file — nationalId,
// nationalIdDocUrl, bankCertificateUrl (see usersController.
// submitVerificationDocuments, HU-14). Without them, this must reject
// the request before creating anything.
export async function createSpace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requester = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!requester) throw AppError.unauthorized('No autenticado');
    if (!requester.nationalId || !requester.nationalIdDocUrl || !requester.bankCertificateUrl) {
      throw AppError.forbidden(
        'Debes enviar tus documentos de verificación (cédula y certificado bancario) antes de publicar un espacio'
      );
    }

    const data = req.body as CreateSpaceInput;

    const space = await prisma.space.create({
      data: {
        ownerId: req.user!.id,
        name: data.name,
        type: data.type,
        city: data.city,
        neighborhood: data.neighborhood,
        capacity: data.capacity,
        pricePerHour: data.pricePerHour,
        description: data.description,
        publicationStatus: 'pending_approval',
        photos: { create: data.photos.map((url) => ({ url })) },
        amenities: {
          create: await Promise.all(
            data.amenities.map(async (name) => {
              const amenity = await prisma.amenity.upsert({
                where: { name },
                update: {},
                create: { name }
              });
              return { amenityId: amenity.id };
            })
          )
        }
      },
      include: SPACE_INCLUDE
    });

    // The first published space upgrades the account to WSpacer+ mode.
    await prisma.user.update({ where: { id: req.user!.id }, data: { isHost: true } });

    res.status(201).json(mapSpace(space));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/spaces/:id — only the owner may edit their own space
export async function updateSpace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaceId = Number(req.params.id);
    const existing = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!existing) throw AppError.notFound('Espacio no encontrado');
    if (existing.ownerId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre este espacio');

    const data = req.body as Partial<CreateSpaceInput>;

    const updated = await prisma.space.update({
      where: { id: spaceId },
      data: {
        name: data.name,
        type: data.type,
        city: data.city,
        neighborhood: data.neighborhood,
        capacity: data.capacity,
        pricePerHour: data.pricePerHour,
        description: data.description
      },
      include: SPACE_INCLUDE
    });

    res.json(mapSpace(updated));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/spaces/:id/toggle-active — temporarily hide/show a space
// without deleting it (e.g. while under renovation)
export async function toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaceId = Number(req.params.id);
    const existing = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!existing) throw AppError.notFound('Espacio no encontrado');
    if (existing.ownerId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre este espacio');

    const updated = await prisma.space.update({
      where: { id: spaceId },
      data: { active: !existing.active }
    });

    res.json({ id: updated.id, active: updated.active });
  } catch (error) {
    next(error);
  }
}
