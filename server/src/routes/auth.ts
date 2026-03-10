// ─── Auth Routes ───
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authRateLimiter } from '../middleware/rateLimit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-whiteboard-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// In-memory user store (Phase 2: PostgreSQL)
interface StoredUser {
  id: string;
  userName: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

const users = new Map<string, StoredUser>();

const registerSchema = z.object({
  userName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRouter = Router();

// Register
authRouter.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { userName, email, password } = registerSchema.parse(req.body);

    // Check if email already exists
    for (const user of users.values()) {
      if (user.email === email) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const user: StoredUser = { id, userName, email, passwordHash, createdAt: Date.now() };
    users.set(id, user);

    const token = jwt.sign(
      { userId: id, userName, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: { token, user: { id, userName, email } },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    let foundUser: StoredUser | undefined;
    for (const user of users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: foundUser.id, userName: foundUser.userName, email: foundUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: { token, user: { id: foundUser.id, userName: foundUser.userName, email: foundUser.email } },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick dev token (for testing without registration)
authRouter.post('/dev-token', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  const userName = req.body.userName || 'Developer';
  const userId = uuidv4();
  const token = jwt.sign(
    { userId, userName, email: `${userName.toLowerCase()}@dev.local` },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ success: true, data: { token, user: { id: userId, userName } } });
});
