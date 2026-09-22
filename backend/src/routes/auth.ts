import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config';
import { authRequired, signToken } from '../middleware/auth';
import { getVapidPublicKey } from '../services/push';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(2),
    password: z.string().min(4),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || !user.active) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = signToken({
    id: user.id,
    role: user.role,
    username: user.username,
    fullName: user.fullName,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ip: req.ip,
    },
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    },
    vapidPublicKey: getVapidPublicKey(),
  });
});

authRouter.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    hourlyRate: user.hourlyRate,
  });
});
