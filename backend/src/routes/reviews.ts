/*
  FILE: src/routes/reviews.ts
*/

import { Router } from 'express';
import { listHostReviews } from '../controllers/reviewsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/host', authMiddleware, listHostReviews);

export default router;
