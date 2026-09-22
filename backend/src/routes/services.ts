import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { Role, ServiceStatus } from '@prisma/client';
import { prisma, config } from '../config';
import { authRequired, requireRole } from '../middleware/auth';
import { writeAudit } from '../middleware/audit';
import { applyWatermark, ensureUploadDir, publicPhotoUrl } from '../services/watermark';
import { calcHoursWorked, hoursOpen } from '../services/hours';
import { sendPushToUser } from '../services/push';

export const servicesRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

servicesRouter.use(authRequired);

servicesRouter.get('/mine/active', async (req, res) => {
  const service = await prisma.service.findFirst({
    where: { driverId: req.user!.id, status: ServiceStatus.OPEN },
  });
  res.json(service);
});

servicesRouter.get('/mine', async (req, res) => {
  const list = await prisma.service.findMany({
    where: { driverId: req.user!.id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  res.json(list);
});

servicesRouter.post('/start', upload.single('photo'), async (req, res) => {
  if (req.user!.role !== Role.DRIVER && req.user!.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Solo conductores' });
  }

  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    accuracy: z.coerce.number().optional(),
    note: z.string().optional(),
    clientStartedAt: z.string().datetime().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  if (!req.file) return res.status(400).json({ error: 'Foto obligatoria' });

  const open = await prisma.service.findFirst({
    where: { driverId: req.user!.id, status: ServiceStatus.OPEN },
  });
  if (open) return res.status(409).json({ error: 'Ya tienes un servicio abierto', serviceId: open.id });

  const startedAt = parsed.data.clientStartedAt
    ? new Date(parsed.data.clientStartedAt)
    : new Date();

  const dir = ensureUploadDir();
  const filename = `start_${req.user!.id}_${Date.now()}.jpg`;
  const watermarked = await applyWatermark(req.file.buffer, {
    fullName: req.user!.fullName,
    when: startedAt,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    kind: 'INICIO',
  });
  await import('fs/promises').then((fs) => fs.writeFile(path.join(dir, filename), watermarked));

  const service = await prisma.service.create({
    data: {
      driverId: req.user!.id,
      status: ServiceStatus.OPEN,
      startedAt,
      startLat: parsed.data.lat,
      startLng: parsed.data.lng,
      startAccuracy: parsed.data.accuracy,
      startPhotoPath: filename,
      startNote: parsed.data.note,
    },
  });

  await writeAudit(req, 'START', 'Service', service.id, {
    lat: parsed.data.lat,
    lng: parsed.data.lng,
  });

  res.status(201).json({
    ...service,
    startPhotoUrl: publicPhotoUrl(filename),
  });
});

servicesRouter.post('/:id/end', upload.single('photo'), async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    accuracy: z.coerce.number().optional(),
    note: z.string().optional(),
    clientEndedAt: z.string().datetime().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  if (!req.file) return res.status(400).json({ error: 'Foto obligatoria al cerrar' });

  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
  if (service.driverId !== req.user!.id && req.user!.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  if (service.status !== ServiceStatus.OPEN) {
    return res.status(409).json({ error: 'El servicio no está abierto' });
  }

  const endedAt = parsed.data.clientEndedAt ? new Date(parsed.data.clientEndedAt) : new Date();
  const hours = calcHoursWorked(service.startedAt, endedAt);

  const dir = ensureUploadDir();
  const filename = `end_${req.user!.id}_${Date.now()}.jpg`;
  const watermarked = await applyWatermark(req.file.buffer, {
    fullName: req.user!.fullName,
    when: endedAt,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    kind: 'CIERRE',
  });
  await import('fs/promises').then((fs) => fs.writeFile(path.join(dir, filename), watermarked));

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: {
      status: ServiceStatus.IN_REVIEW,
      endedAt,
      endLat: parsed.data.lat,
      endLng: parsed.data.lng,
      endAccuracy: parsed.data.accuracy,
      endPhotoPath: filename,
      endNote: parsed.data.note,
      hoursWorked: hours,
    },
  });

  await writeAudit(req, 'END', 'Service', service.id, { hours });

  res.json({
    ...updated,
    endPhotoUrl: publicPhotoUrl(filename),
  });
});

servicesRouter.get('/', requireRole(Role.ADMIN), async (req, res) => {
  const {
    driverId,
    status,
    from,
    to,
    q,
    page = '1',
    pageSize = '20',
  } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (driverId) where.driverId = driverId;
  if (status) where.status = status as ServiceStatus;
  if (from || to) {
    where.startedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { startNote: { contains: q, mode: 'insensitive' } },
      { endNote: { contains: q, mode: 'insensitive' } },
      { adminNotes: { contains: q, mode: 'insensitive' } },
      { driver: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const take = Math.min(Number(pageSize) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, items] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      include: {
        driver: { select: { id: true, fullName: true, phone: true, username: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.json({
    total,
    page: Number(page) || 1,
    pageSize: take,
    items: items.map((s) => ({
      ...s,
      startPhotoUrl: publicPhotoUrl(s.startPhotoPath),
      endPhotoUrl: s.endPhotoPath ? publicPhotoUrl(s.endPhotoPath) : null,
      openHours: s.status === ServiceStatus.OPEN ? hoursOpen(s.startedAt) : null,
      alertOpen: s.status === ServiceStatus.OPEN && hoursOpen(s.startedAt) >= config.alertOpenHours,
    })),
  });
});

servicesRouter.get('/:id', async (req, res) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: {
      driver: { select: { id: true, fullName: true, phone: true, username: true, hourlyRate: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });
  if (!service) return res.status(404).json({ error: 'No encontrado' });
  if (req.user!.role !== Role.ADMIN && service.driverId !== req.user!.id) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  res.json({
    ...service,
    startPhotoUrl: publicPhotoUrl(service.startPhotoPath),
    endPhotoUrl: service.endPhotoPath ? publicPhotoUrl(service.endPhotoPath) : null,
    openHours: service.status === ServiceStatus.OPEN ? hoursOpen(service.startedAt) : null,
  });
});

servicesRouter.patch('/:id/review', requireRole(Role.ADMIN), async (req, res) => {
  const schema = z.object({
    status: z.enum(['IN_REVIEW', 'APPROVED', 'CLOSED']),
    adminNotes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status as ServiceStatus,
      adminNotes: parsed.data.adminNotes,
      reviewedAt: new Date(),
      reviewedById: req.user!.id,
    },
    include: {
      driver: { select: { id: true, fullName: true, phone: true } },
    },
  });

  await writeAudit(req, 'REVIEW', 'Service', service.id, parsed.data);
  res.json(service);
});

servicesRouter.post('/alerts/check-open', requireRole(Role.ADMIN), async (_req, res) => {
  const open = await prisma.service.findMany({
    where: { status: ServiceStatus.OPEN },
    include: { driver: true },
  });
  const alerted: string[] = [];
  for (const s of open) {
    const h = hoursOpen(s.startedAt);
    if (h >= config.alertOpenHours) {
      await sendPushToUser(s.driverId, {
        title: 'Servicio abierto demasiado tiempo',
        body: `Llevas ${h.toFixed(1)} horas con el servicio activo. Ciérralo si ya terminaste.`,
        url: '/',
      });
      alerted.push(s.id);
    }
  }
  res.json({ checked: open.length, alerted: alerted.length, ids: alerted });
});
