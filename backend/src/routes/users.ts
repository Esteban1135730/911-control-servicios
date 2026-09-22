import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config';
import { authRequired, requireRole } from '../middleware/auth';
import { writeAudit } from '../middleware/audit';

export const usersRouter = Router();

usersRouter.use(authRequired, requireRole(Role.ADMIN));

usersRouter.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const role = req.query.role as Role | undefined;
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      role: true,
      active: true,
      hourlyRate: true,
      createdAt: true,
    },
  });
  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
    fullName: z.string().min(3),
    phone: z.string().min(7),
    role: z.enum(['ADMIN', 'DRIVER']).default('DRIVER'),
    hourlyRate: z.number().nonnegative().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (exists) return res.status(409).json({ error: 'Usuario ya existe' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      role: parsed.data.role as Role,
      hourlyRate: parsed.data.hourlyRate,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      role: true,
      active: true,
      hourlyRate: true,
    },
  });

  await writeAudit(req, 'CREATE', 'User', user.id, { username: user.username, role: user.role });
  res.status(201).json(user);
});

usersRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(3).optional(),
    phone: z.string().min(7).optional(),
    active: z.boolean().optional(),
    hourlyRate: z.number().nonnegative().nullable().optional(),
    password: z.string().min(6).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    delete data.password;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      role: true,
      active: true,
      hourlyRate: true,
    },
  });

  await writeAudit(req, 'UPDATE', 'User', user.id, parsed.data);
  res.json(user);
});
