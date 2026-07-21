/*
  FILE: src/controllers/notificationsController.ts

  What does this file do?
  In-app notifications only — no email, push, or WebSockets (explicitly
  out of scope, see docs/GUIDE.md). notify() is called from
  bookingsController.ts at the points where a booking's status changes
  in a way the other party (guest or host) should know about; the rest
  of this file is what the notifications screen (notifications.js) reads.
*/

import type { Request, Response, NextFunction } from 'express';
import type { NotificationType } from '@prisma/client';
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// Not an HTTP handler — a small helper other controllers call directly.
export async function notify(userId: number, type: NotificationType, message: string): Promise<void> {
  await prisma.notification.create({ data: { userId, type, message } });
}

// GET /api/notifications
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
}

// PATCH /api/notifications/:id/read
export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notificationId = Number(req.params.id);
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw AppError.notFound('Notificación no encontrada');
    if (notification.userId !== req.user!.id) throw AppError.forbidden('No tienes permiso sobre esta notificación');

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

// PATCH /api/notifications/read-all
export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
