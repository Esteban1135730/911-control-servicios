import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  photoRetentionDays: Number(process.env.PHOTO_RETENTION_DAYS || 365),
  alertOpenHours: Number(process.env.ALERT_OPEN_HOURS || 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@911transportes.com',
  },
};
