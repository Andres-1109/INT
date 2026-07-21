/*
  FILE: src/middleware/validateBody.ts

  What does this file do?
  A generic middleware that validates the request body against a zod
  schema before it reaches the controller. This is the ONLY validation
  approach used in this backend — the original Daniel repo had two
  parallel systems (express-validator AND zod) with the zod one unused;
  this merge standardizes on zod everywhere for consistency.
*/

import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(AppError.badRequest('Datos inválidos', error.flatten()));
        return;
      }
      next(error);
    }
  };
}
