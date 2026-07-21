/*
  FILE: src/server.ts

  What does this file do?
  Wires together every route group and middleware, and starts the
  Express server listening on PORT.
*/

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import spacesRoutes from './routes/spaces.js';
import bookingsRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import usersRoutes from './routes/users.js';
import favoritesRoutes from './routes/favorites.js';
import notificationsRoutes from './routes/notifications.js';
import reviewsRoutes from './routes/reviews.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reviews', reviewsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WSPACE backend listening on http://localhost:${PORT}`);
});
