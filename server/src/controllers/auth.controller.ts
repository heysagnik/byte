import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import * as db from '../services/db.service';
import { signToken } from '../services/jwt.service';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { email, password } = parse.data;

  try {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.createUser(email, passwordHash);

    const token = signToken({ userId: user._id.toString(), email: user.email });
    res.status(201).json({ token, user: { id: user._id.toString(), email: user.email } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(500).json({ error: message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { email, password } = parse.data;

  try {
    const user = await db.findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });
    res.json({ token, user: { id: user._id.toString(), email: user.email } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json({ error: message });
  }
}
