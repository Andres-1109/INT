/*
  FILE: src/validators/userValidators.ts
*/

import { z } from 'zod';

export const verificationDocumentsSchema = z.object({
  nationalId: z.string().trim().min(5, 'Ingresa un número de cédula válido'),
  nationalIdDocUrl: z.string().url('La URL del documento de cédula no es válida'),
  bankCertificateUrl: z.string().url('La URL del certificado bancario no es válida')
});

export type VerificationDocumentsInput = z.infer<typeof verificationDocumentsSchema>;
