import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
}
