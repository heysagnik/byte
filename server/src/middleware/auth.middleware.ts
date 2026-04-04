import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/jwt.service';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** SSE variant: reads token from ?token= query param (EventSource can't send headers) */
export function sseAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.query['token'] as string | undefined;
  if (!token) {
    res.status(401).end();
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).end();
  }
}
