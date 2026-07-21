/*
  FILE: src/routes/favorites.ts
*/

import { Router } from 'express';
import { listFavorites, addFavorite, removeFavorite } from '../controllers/favoritesController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { addFavoriteSchema } from '../validators/favoriteValidators.js';

const router = Router();

router.get('/', authMiddleware, listFavorites);
router.post('/', authMiddleware, validateBody(addFavoriteSchema), addFavorite);
router.delete('/:spaceId', authMiddleware, removeFavorite);

export default router;
