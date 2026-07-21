/*
  FILE: src/validators/blockValidators.ts
*/

import { z } from 'zod';

// Matches the value an <input type="datetime-local"> sends: no timezone
// suffix, e.g. "2026-07-20T14:00". Kept simple for the MVP, same spirit
// as Space.openingTime/closingTime storing plain "HH:MM" strings.
const dateTimeLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Fecha y hora inválida');

export const createBlockSchema = z
  .object({
    startDate: dateTimeLocal,
    endDate: dateTimeLocal,
    reason: z.string().trim().max(200).optional()
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate']
  });

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
