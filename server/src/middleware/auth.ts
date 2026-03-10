// ─── JWT Auth Middleware ───
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../../../shared/src/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-whiteboard-secret-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // In dev mode, allow anonymous access with a default user
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: 'anonymous',
        userName: 'Anonymous',
        email: 'anon@local',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 86400,
      };
      return next();
    }
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}
