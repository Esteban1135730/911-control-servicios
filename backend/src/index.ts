import { createApp } from './app';
import { config, prisma } from './config';
import { initPush } from './services/push';
import { hoursOpen } from './services/hours';
import { ServiceStatus } from '@prisma/client';
import { sendPushToUser } from './services/push';

async function alertLoop() {
  try {
    const open = await prisma.service.findMany({
      where: { status: ServiceStatus.OPEN },
      include: { driver: true },
    });
    for (const s of open) {
      const h = hoursOpen(s.startedAt);
      if (h >= config.alertOpenHours) {
        await sendPushToUser(s.driverId, {
          title: 'Alerta: servicio abierto',
          body: `${s.driver.fullName}, llevas ${h.toFixed(1)}h con servicio activo.`,
          url: '/',
        });
      }
    }
  } catch (e) {
    console.error('alertLoop', e);
  }
}

async function main() {
  initPush();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API 911 escuchando en :${config.port}`);
  });
  // Cada 30 minutos revisar servicios abiertos demasiado tiempo
  setInterval(alertLoop, 30 * 60 * 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
