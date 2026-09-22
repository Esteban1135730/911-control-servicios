import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { ensureUploadDir } from './services/watermark';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { servicesRouter } from './routes/services';
import { adminRouter } from './routes/admin';
import { pushRouter } from './routes/push';

export function createApp() {
  const app = express();
  ensureUploadDir();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads', express.static(path.resolve(config.uploadDir)));

  app.get('/health', (_req, res) => res.json({ ok: true, service: '911-api' }));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/push', pushRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno', message: err.message });
  });

  return app;
}
