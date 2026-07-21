/*
  FILE: src/controllers/usersController.ts

  What does this file do?
  Saves the verification documents (national ID number, ID scan, bank
  certificate) a WSpacer submits to be able to receive payouts as a
  WSpacer+. The User model already had columns for this
  (nationalId/nationalIdDocUrl/bankCertificateUrl), but nothing ever
  wrote to them — this is that missing endpoint.

  Note: submitting these documents does NOT by itself flip isHost to
  true — that still happens automatically the moment the account
  publishes its first space (see spacesController.createSpace). Whether
  publishing should require these documents on file first is an open
  question for the team (see docs/WSPACE_Backlog_Detallado.md, HU-14).
*/

import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import type { VerificationDocumentsInput } from '../validators/userValidators.js';

// PATCH /api/users/me/verification-documents
export async function submitVerificationDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nationalId, nationalIdDocUrl, bankCertificateUrl } = req.body as VerificationDocumentsInput;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { nationalId, nationalIdDocUrl, bankCertificateUrl }
    });

    res.json({
      id: updated.id,
      nationalId: updated.nationalId,
      nationalIdDocUrl: updated.nationalIdDocUrl,
      bankCertificateUrl: updated.bankCertificateUrl
    });
  } catch (error) {
    next(error);
  }
}
