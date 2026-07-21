/*
  FILE: src/routes/notifications.ts
*/

import { Router } from 'express';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, listNotifications);
router.patch('/read-all', authMiddleware, markAllNotificationsRead);
router.patch('/:id/read', authMiddleware, markNotificationRead);

export default router;
