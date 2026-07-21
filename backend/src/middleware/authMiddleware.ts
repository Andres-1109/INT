/*
  FILE: src/middleware/authMiddleware.ts

  What does this file do?
  Acts as a "security guard" that checks, before letting a request
  through, whether it carries a valid "digital ID card" (JWT token). If
  it's missing or expired, the request is rejected with a 401. If it's
  valid, the request goes through and req.user is filled in.
*/

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export interface AuthPayload {
  id: number;
  email: string;
  role: string;
}

// Augment Express's Request type so req.user is typed everywhere,
// instead of needing "as any" casts throughout the routes.
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthPayload;
  }
}

// Reading process.env.JWT_SECRET directly leaves it typed as
// "string | undefined", which breaks jwt.sign/verify's type
// overloads. Routing it through a small helper that throws — instead
// of an inline "if (!x) throw" right after the assignment — is what
// lets TypeScript narrow this constant to a plain "string" everywhere
// it's used below.
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fails fast and loudly at startup instead of silently falling back
    // to a hardcoded secret. A missing JWT_SECRET must never be tolerated.
    throw new Error(`${name} is not set. Copy .env.example to .env and set a real value.`);
  }
  return value;
}

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No autenticado'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    next(AppError.unauthorized('Token inválido o expirado'));
  }
}

// Used on routes that only the seeded admin account may call.
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    return next(AppError.forbidden('Requiere rol de administrador'));
  }
  next();
}
