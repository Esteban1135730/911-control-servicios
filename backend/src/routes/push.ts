import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config';
import { authRequired } from '../middleware/auth';
import { getVapidPublicKey } from '../services/push';

export const pushRouter = Router();

pushRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

pushRouter.post('/subscribe', authRequired, async (req, res) => {
  const schema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Suscripción inválida' });

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: req.user!.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    update: {
      userId: req.user!.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
  });

  res.json({ ok: true });
});
