/*
  FILE: src/routes/admin.ts
*/

import { Router } from 'express';
import { listPendingSpaces, approveSpace, rejectSpace } from '../controllers/adminController.js';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware, requireAdmin);
router.get('/spaces/pending', listPendingSpaces);
router.patch('/spaces/:id/approve', approveSpace);
router.patch('/spaces/:id/reject', rejectSpace);

export default router;
