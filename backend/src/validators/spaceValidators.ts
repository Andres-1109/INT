/*
  FILE: src/validators/spaceValidators.ts
*/

import { z } from 'zod';

// Must match SpaceCategory in prisma/schema.prisma AND the CATEGORY_LABELS
// keys in frontend/js/core/utils.js — all three have to stay in sync.
const SPACE_CATEGORIES = [
  'private_office',
  'meeting_room',
  'coworking',
  'creative_space',
  'rehearsal_room'
] as const;

export const createSpaceSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio'),
  type: z.enum(SPACE_CATEGORIES, { message: 'Tipo de espacio inválido' }),
  city: z.string().trim().min(2, 'La ciudad es obligatoria'),
  neighborhood: z.string().trim().min(2, 'El barrio es obligatorio'),
  capacity: z.coerce.number().int().min(1, 'La capacidad debe ser al menos 1'),
  pricePerHour: z.coerce.number().min(1000, 'El precio debe ser mayor a 0'),
  description: z.string().trim().optional(),
  photos: z.array(z.string().url()).default([]),
  amenities: z.array(z.string()).default([])
});

export const updateSpaceSchema = createSpaceSchema.partial();

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
