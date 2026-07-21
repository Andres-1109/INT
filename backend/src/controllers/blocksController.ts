/*
  FILE: src/controllers/blocksController.ts

  What does this file do?
  Lets a WSpacer+ block off dates/times on their own space so guests
  can't book during that window (maintenance, personal use, etc.).

  The SpaceBlock table and the check against it already existed —
  bookingsController.createBooking already rejects a new booking that
  overlaps an existing block — but until now there was no way to
  actually create one through the API. This file is that missing piece.
*/

import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateBlockInput } from '../validators/blockValidators.js';

// Parses a "YYYY-MM-DDTHH:MM" value (what an <input type="datetime-local">
// sends — no timezone offset) as a UTC instant, ignoring the server's
// local timezone entirely. Plain `new Date("2026-08-01T09:00")` would
// instead parse it as the SERVER's local time per the JS spec, which
// silently breaks the moment this runs on a machine set to a different
// timezone than whoever deployed it expected. Same reasoning as
// combineDateAndTime() in bookingsController.ts — this must line up with
// how bookings compute their instants, or a block and a booking that
// "look" like the same date/time on screen would compare as different
// moments internally.
function parseDateTimeLocalAsUTC(value: string): Date {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

async function assertOwnsSpace(spaceId: number, userId: number): Promise<void> {
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) throw AppError.notFound('Espacio no encontrado');
  if (space.ownerId !== userId) throw AppError.forbidden('No tienes permiso sobre este espacio');
}

// GET /api/spaces/:id/blocks — only the owner can see their own blocks
export async function listBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaceId = Number(req.params.id);
    await assertOwnsSpace(spaceId, req.user!.id);

    const blocks = await prisma.spaceBlock.findMany({
      where: { spaceId },
      orderBy: { startDate: 'asc' }
    });

    res.json(blocks);
  } catch (error) {
    next(error);
  }
}

// POST /api/spaces/:id/blocks
export async function createBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaceId = Number(req.params.id);
    await assertOwnsSpace(spaceId, req.user!.id);

    const data = req.body as CreateBlockInput;

    const block = await prisma.spaceBlock.create({
      data: {
        spaceId,
        startDate: parseDateTimeLocalAsUTC(data.startDate),
        endDate: parseDateTimeLocalAsUTC(data.endDate),
        reason: data.reason
      }
    });

    res.status(201).json(block);
  } catch (error) {
    next(error);
  }
}

// DELETE /api/spaces/:id/blocks/:blockId
export async function deleteBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaceId = Number(req.params.id);
    await assertOwnsSpace(spaceId, req.user!.id);

    const blockId = Number(req.params.blockId);
    const block = await prisma.spaceBlock.findUnique({ where: { id: blockId } });
    if (!block || block.spaceId !== spaceId) throw AppError.notFound('Bloqueo no encontrado');

    await prisma.spaceBlock.delete({ where: { id: blockId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
