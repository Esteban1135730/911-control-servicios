import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { config } from '../config';

export function ensureUploadDir() {
  const dir = path.resolve(config.uploadDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function applyWatermark(
  inputBuffer: Buffer,
  meta: {
    fullName: string;
    when: Date;
    lat: number;
    lng: number;
    kind: 'INICIO' | 'CIERRE';
  }
) {
  const whenStr = meta.when.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const lines = [
    `911 · ${meta.kind}`,
    meta.fullName,
    whenStr,
    `${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`,
  ];

  const image = sharp(inputBuffer).rotate();
  const { width = 1280 } = await image.metadata();
  const targetWidth = Math.min(width, 1600);
  const resized = image.resize({ width: targetWidth, withoutEnlargement: true });
  const meta2 = await resized.metadata();
  const w = meta2.width || targetWidth;
  const h = meta2.height || 900;
  const fontSize = Math.max(18, Math.round(w * 0.028));
  const lineHeight = fontSize + 8;
  const boxH = lineHeight * lines.length + 24;
  const boxW = Math.min(w - 24, Math.round(w * 0.72));

  const textSvg = `
    <svg width="${w}" height="${h}">
      <rect x="12" y="${h - boxH - 12}" width="${boxW}" height="${boxH}" rx="10" fill="rgba(15,23,42,0.72)"/>
      ${lines
        .map(
          (line, i) =>
            `<text x="24" y="${h - boxH - 12 + 28 + i * lineHeight}" fill="#ffffff" font-size="${fontSize}" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`
        )
        .join('')}
    </svg>
  `;

  return resized
    .composite([{ input: Buffer.from(textSvg), top: 0, left: 0 }])
    .jpeg({ quality: 82 })
    .toBuffer();
}

export function publicPhotoUrl(filename: string) {
  return `/uploads/${filename}`;
}
