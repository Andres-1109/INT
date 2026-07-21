/*
  FILE: src/validators/favoriteValidators.ts
*/

import { z } from 'zod';

export const addFavoriteSchema = z.object({
  spaceId: z.coerce.number().int().positive()
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
