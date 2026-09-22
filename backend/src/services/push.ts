import webpush from 'web-push';
import { prisma, config } from '../config';

let configured = false;

export function initPush() {
  if (config.vapid.publicKey && config.vapid.privateKey) {
    webpush.setVapidDetails(
      config.vapid.subject,
      config.vapid.publicKey,
      config.vapid.privateKey
    );
    configured = true;
  }
}

export function getVapidPublicKey() {
  return config.vapid.publicKey || null;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!configured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      }
    })
  );
}
