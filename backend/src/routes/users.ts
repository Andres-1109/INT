/*
  FILE: src/routes/users.ts
*/

import { Router } from 'express';
import { submitVerificationDocuments } from '../controllers/usersController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { verificationDocumentsSchema } from '../validators/userValidators.js';

const router = Router();

router.patch(
  '/me/verification-documents',
  authMiddleware,
  validateBody(verificationDocumentsSchema),
  submitVerificationDocuments
);

export default router;
