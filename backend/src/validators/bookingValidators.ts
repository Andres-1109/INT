/*
  FILE: src/validators/bookingValidators.ts
*/

import { z } from 'zod';

export const createBookingSchema = z.object({
  spaceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de inicio inválida'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de fin inválida')
});

export const respondBookingSchema = z.object({
  status: z.enum(['confirmed', 'rejected'], { message: 'Estado inválido' })
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
