/*
  FILE: src/controllers/favoritesController.ts

  What does this file do?
  Lets a WSpacer save a space as a favorite, list their favorites, and
  remove one. The heart button on a space card (see spaceCard.js) talks
  to these three endpoints.
*/

import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { SPACE_INCLUDE, mapSpace } from './spacesController.js';
import type { AddFavoriteInput } from '../validators/favoriteValidators.js';

// GET /api/favorites — every space the current user has favorited
export async function listFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: { space: { include: SPACE_INCLUDE } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(favorites.map((favorite) => mapSpace(favorite.space)));
  } catch (error) {
    next(error);
  }
}

// POST /api/favorites — marks a space as favorite. Idempotent: favoriting
// an already-favorited space just returns the existing favorite instead
// of erroring, so the frontend's heart button never has to track whether
// this is the first click or not.
export async function addFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { spaceId } = req.body as AddFavoriteInput;

    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw AppError.notFound('Espacio no encontrado');

    await prisma.favorite.upsert({
      where: { userId_spaceId: { userId: req.user!.id, spaceId } },
      update: {},
      create: { userId: req.user!.id, spaceId }
    });

    res.status(201).json({ spaceId, favorited: true });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/favorites/:spaceId — un-favorites a space. Also idempotent:
// no error if it wasn't favorited in the first place.
export async function removeFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spaceId = Number(req.params.spaceId);
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, spaceId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
