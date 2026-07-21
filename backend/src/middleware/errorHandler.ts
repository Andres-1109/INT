/*
  FILE: src/middleware/errorHandler.ts

  What does this file do?
  A single place that catches every error thrown anywhere in the app
  (routes, controllers, Prisma) and turns it into a consistent JSON
  response. Without this, every route would need its own try/catch
  with slightly different error formatting.
*/

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

interface ErrorResponse {
  message: string;
  details?: unknown;
}

// Prisma 7 with the @prisma/adapter-pg driver adapter (see config/db.ts)
// puts the offending column(s) of a unique-constraint violation in a
// different place than "classic" Prisma: not the flat error.meta.target
// array, but nested under meta.driverAdapterError.cause.constraint.fields
// (with the raw quoted column name straight from Postgres, e.g.
// '"nationalId"'). The old meta.target shape is kept as a fallback in
// case a future Prisma version reverts, or a non-adapter setup is used.
function extractUniqueConstraintFields(meta: Record<string, unknown> | undefined): string {
  const driverError = meta?.['driverAdapterError'] as { cause?: { constraint?: { fields?: unknown } } } | undefined;
  const driverFields = driverError?.cause?.constraint?.fields;
  if (Array.isArray(driverFields)) {
    return driverFields.map((field) => String(field).replace(/"/g, '')).join(', ');
  }

  const target = meta?.['target'];
  if (Array.isArray(target)) return target.join(', ');
  if (typeof target === 'string') return target;

  return 'ese campo';
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
} {
  switch (error.code) {
    case 'P2002': {
      const fields = extractUniqueConstraintFields(error.meta);
      return {
        statusCode: 409,
        message: `Ya existe un registro con ese valor: ${fields}`
      };
    }
    case 'P2025':
      return { statusCode: 404, message: 'Recurso no encontrado' };
    case 'P2003':
      return { statusCode: 400, message: 'Referencia inválida: el recurso relacionado no existe' };
    default:
      return { statusCode: 500, message: 'Error de base de datos' };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const parsed = handlePrismaError(err);
    statusCode = parsed.statusCode;
    message = parsed.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Datos inválidos para la base de datos';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  const body: ErrorResponse = { message, ...(details !== undefined ? { details } : {}) };
  res.status(statusCode).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
}
