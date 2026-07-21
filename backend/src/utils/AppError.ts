/*
  FILE: src/utils/AppError.ts

  What does this file do?
  A custom error class used throughout the backend to represent
  "expected" errors (a space that doesn't exist, an invalid password,
  a permission problem) with an HTTP status code attached, instead of
  generic JavaScript errors. This lets the central error handler
  (errorHandler.ts) know exactly what status and message to send back,
  instead of guessing.
*/

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message: string) {
    return new AppError(message, 401);
  }

  static forbidden(message: string) {
    return new AppError(message, 403);
  }

  static notFound(message: string) {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }
}
