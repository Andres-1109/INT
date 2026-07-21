/*
  FILE: src/controllers/adminController.ts

  What does this file do?
  Endpoints only the seeded admin account can call, to review spaces
  that are pending approval. A space never shows up in public search
  (see spacesController.searchSpaces) until it's been approved here.

  Merge note: neither original repo had an admin screen built in the
  frontend for this — both had the approval workflow only in the data
  model/docs, with no UI to actually act on it. These endpoints exist
  so the workflow is complete on the backend; a frontend admin panel
  is listed as pending work in the final report.
*/

import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export async function listPendingSpaces(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaces = await prisma.space.findMany({
      where: { publicationStatus: 'pending_approval' },
      include: { owner: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(spaces);
  } catch (error) {
    next(error);
  }
}

export async function approveSpace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const space = await prisma.space.update({
      where: { id: Number(req.params.id) },
      data: { publicationStatus: 'approved', rejectionReason: null }
    });
    res.json({ id: space.id, publicationStatus: space.publicationStatus });
  } catch (error) {
    next(error);
  }
}

export async function rejectSpace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body as { reason?: string };
    if (!reason || !reason.trim()) {
      throw AppError.badRequest('El motivo de rechazo es obligatorio');
    }

    const space = await prisma.space.update({
      where: { id: Number(req.params.id) },
      data: { publicationStatus: 'rejected', rejectionReason: reason }
    });
    res.json({ id: space.id, publicationStatus: space.publicationStatus });
  } catch (error) {
    next(error);
  }
}
