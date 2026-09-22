import { Router } from 'express';
import ExcelJS from 'exceljs';
import { Role, ServiceStatus, Prisma } from '@prisma/client';
import { prisma, config } from '../config';
import { authRequired, requireRole } from '../middleware/auth';
import { hoursOpen } from '../services/hours';
import { publicPhotoUrl } from '../services/watermark';

export const adminRouter = Router();
adminRouter.use(authRequired, requireRole(Role.ADMIN));

adminRouter.get('/dashboard', async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    openCount,
    closedToday,
    driversActive,
    hoursMonth,
    openServices,
    byDay,
    byDriver,
  ] = await Promise.all([
    prisma.service.count({ where: { status: ServiceStatus.OPEN } }),
    prisma.service.count({
      where: {
        endedAt: { gte: startOfDay },
        status: { in: [ServiceStatus.CLOSED, ServiceStatus.IN_REVIEW, ServiceStatus.APPROVED] },
      },
    }),
    prisma.user.count({ where: { role: Role.DRIVER, active: true } }),
    prisma.service.aggregate({
      where: { startedAt: { gte: startOfMonth }, hoursWorked: { not: null } },
      _sum: { hoursWorked: true },
    }),
    prisma.service.findMany({
      where: { status: ServiceStatus.OPEN },
      include: { driver: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.$queryRaw<{ day: Date; count: bigint; hours: number | null }[]>`
      SELECT date_trunc('day', "startedAt") as day,
             COUNT(*)::bigint as count,
             COALESCE(SUM("hoursWorked"), 0)::float as hours
      FROM "Service"
      WHERE "startedAt" >= NOW() - INTERVAL '14 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<{ driverId: string; fullName: string; hours: number; services: bigint }[]>`
      SELECT s."driverId" as "driverId", u."fullName" as "fullName",
             COALESCE(SUM(s."hoursWorked"), 0)::float as hours,
             COUNT(*)::bigint as services
      FROM "Service" s
      JOIN "User" u ON u.id = s."driverId"
      WHERE s."startedAt" >= ${startOfMonth}
      GROUP BY s."driverId", u."fullName"
      ORDER BY hours DESC
      LIMIT 10
    `,
  ]);

  const alerts = openServices
    .map((s) => ({
      ...s,
      openHours: hoursOpen(s.startedAt),
      alertOpen: hoursOpen(s.startedAt) >= config.alertOpenHours,
      startPhotoUrl: publicPhotoUrl(s.startPhotoPath),
    }))
    .filter((s) => s.alertOpen);

  res.json({
    kpis: {
      openNow: openCount,
      closedToday,
      driversActive,
      hoursThisMonth: Number(hoursMonth._sum.hoursWorked || 0),
      alertThresholdHours: config.alertOpenHours,
      alertsCount: alerts.length,
    },
    openServices: openServices.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      driver: s.driver,
      openHours: hoursOpen(s.startedAt),
      alertOpen: hoursOpen(s.startedAt) >= config.alertOpenHours,
      startLat: s.startLat,
      startLng: s.startLng,
    })),
    charts: {
      last14Days: byDay.map((d) => ({
        day: d.day,
        count: Number(d.count),
        hours: Number(d.hours || 0),
      })),
      topDriversMonth: byDriver.map((d) => ({
        driverId: d.driverId,
        fullName: d.fullName,
        hours: Number(d.hours),
        services: Number(d.services),
      })),
    },
    alerts,
  });
});

adminRouter.get('/audit', async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 50, 200);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { fullName: true, username: true } } },
  });
  res.json(logs);
});

adminRouter.get('/export/excel', async (req, res) => {
  const { driverId, status, from, to, mode } = req.query as Record<string, string>;
  const where: Prisma.ServiceWhereInput = {};
  if (driverId) where.driverId = driverId;
  if (status) where.status = status as ServiceStatus;
  if (from || to) {
    where.startedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      driver: { select: { fullName: true, phone: true, username: true, hourlyRate: true } },
      reviewedBy: { select: { fullName: true } },
    },
    orderBy: [{ driverId: 'asc' }, { startedAt: 'asc' }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '911 Transportes';
  workbook.created = new Date();

  const sheetGeneral = workbook.addWorksheet('General');
  sheetGeneral.columns = [
    { header: 'Conductor', key: 'driver', width: 28 },
    { header: 'Usuario', key: 'username', width: 16 },
    { header: 'Teléfono', key: 'phone', width: 16 },
    { header: 'Estado', key: 'status', width: 12 },
    { header: 'Inicio', key: 'start', width: 22 },
    { header: 'Fin', key: 'end', width: 22 },
    { header: 'Horas', key: 'hours', width: 10 },
    { header: 'Tarifa/h', key: 'rate', width: 10 },
    { header: 'Monto est.', key: 'amount', width: 12 },
    { header: 'Lat inicio', key: 'slat', width: 12 },
    { header: 'Lng inicio', key: 'slng', width: 12 },
    { header: 'Lat fin', key: 'elat', width: 12 },
    { header: 'Lng fin', key: 'elng', width: 12 },
    { header: 'Nota inicio', key: 'snote', width: 28 },
    { header: 'Nota cierre', key: 'enote', width: 28 },
    { header: 'Obs. admin', key: 'anote', width: 28 },
    { header: 'Revisado por', key: 'reviewer', width: 20 },
  ];

  for (const s of services) {
    const hours = s.hoursWorked ? Number(s.hoursWorked) : null;
    const rate = s.driver.hourlyRate ? Number(s.driver.hourlyRate) : null;
    sheetGeneral.addRow({
      driver: s.driver.fullName,
      username: s.driver.username,
      phone: s.driver.phone,
      status: s.status,
      start: s.startedAt.toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      end: s.endedAt
        ? s.endedAt.toLocaleString('es-CO', { timeZone: 'America/Bogota' })
        : '',
      hours,
      rate,
      amount: hours != null && rate != null ? Number((hours * rate).toFixed(2)) : '',
      slat: s.startLat,
      slng: s.startLng,
      elat: s.endLat ?? '',
      elng: s.endLng ?? '',
      snote: s.startNote || '',
      enote: s.endNote || '',
      anote: s.adminNotes || '',
      reviewer: s.reviewedBy?.fullName || '',
    });
  }

  if (mode !== 'general') {
    const byDriver = new Map<string, typeof services>();
    for (const s of services) {
      const key = s.driver.fullName;
      if (!byDriver.has(key)) byDriver.set(key, []);
      byDriver.get(key)!.push(s);
    }
    const summary = workbook.addWorksheet('Por conductor');
    summary.columns = [
      { header: 'Conductor', key: 'driver', width: 28 },
      { header: 'Servicios', key: 'count', width: 12 },
      { header: 'Horas totales', key: 'hours', width: 14 },
      { header: 'Monto est.', key: 'amount', width: 14 },
    ];
    for (const [name, list] of byDriver) {
      const hours = list.reduce((a, s) => a + (s.hoursWorked ? Number(s.hoursWorked) : 0), 0);
      const rate = list[0]?.driver.hourlyRate ? Number(list[0].driver.hourlyRate) : null;
      summary.addRow({
        driver: name,
        count: list.length,
        hours: Number(hours.toFixed(4)),
        amount: rate != null ? Number((hours * rate).toFixed(2)) : '',
      });
    }
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="911-servicios-${Date.now()}.xlsx"`
  );
  await workbook.xlsx.write(res);
  res.end();
});
