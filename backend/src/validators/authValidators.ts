/*
  FILE: src/validators/authValidators.ts
*/

import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Ingresa tu nombre'),
    lastName: z.string().trim().min(2, 'Ingresa tu apellido'),
    email: z.string().email('Ingresa un correo válido'),
    phone: z.string().regex(/^\d{10}$/, 'Ingresa un teléfono válido (10 dígitos)'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'Debes aceptar los términos y condiciones' })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  });

export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
