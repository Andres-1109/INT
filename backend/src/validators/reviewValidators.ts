/*
  FILE: src/validators/reviewValidators.ts
*/

import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'La calificación debe ser entre 1 y 5').max(5, 'La calificación debe ser entre 1 y 5'),
  comment: z.string().trim().max(500).optional()
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
