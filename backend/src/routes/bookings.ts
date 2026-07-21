/*
  FILE: src/routes/bookings.ts
*/

import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getHostBookings,
  respondBooking,
  cancelBooking,
  hostCancelBooking,
  completeBooking
} from '../controllers/bookingsController.js';
import { createReview } from '../controllers/reviewsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { createBookingSchema, respondBookingSchema } from '../validators/bookingValidators.js';
import { createReviewSchema } from '../validators/reviewValidators.js';

const router = Router();

router.post('/', authMiddleware, validateBody(createBookingSchema), createBooking);
router.get('/mine', authMiddleware, getMyBookings);
router.get('/host', authMiddleware, getHostBookings);
router.patch('/:id/respond', authMiddleware, validateBody(respondBookingSchema), respondBooking);
router.patch('/:id/cancel', authMiddleware, cancelBooking);
router.patch('/:id/host-cancel', authMiddleware, hostCancelBooking);
router.patch('/:id/complete', authMiddleware, completeBooking);
router.post('/:id/review', authMiddleware, validateBody(createReviewSchema), createReview);

export default router;
