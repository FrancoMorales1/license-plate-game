import { redisConnection } from '../queue/connection.js';
import { env } from '../config/env.js';

const COUNT_PREFIX = 'vision-ocr:count';
const NOTICE_PREFIX = 'vision-ocr:limit-notified';
const KEY_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 días: cubre el mes en curso + margen

function monthKey(prefix: string, date = new Date()): string {
  const ym = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${prefix}:${ym}`;
}

/** true si todavía queda presupuesto de Vision este mes (según nuestro propio contador). */
export async function hasVisionBudget(): Promise<boolean> {
  const count = Number(await redisConnection.get(monthKey(COUNT_PREFIX))) || 0;
  return count < env.VISION_MONTHLY_LIMIT;
}

/** Registra una llamada real a Vision. Llamar solo después de un textDetection exitoso. */
export async function recordVisionCall(): Promise<void> {
  const key = monthKey(COUNT_PREFIX);
  const count = await redisConnection.incr(key);
  if (count === 1) {
    await redisConnection.expire(key, KEY_TTL_SECONDS);
  }
}

/**
 * Devuelve true solo la primera vez que se llama en el mes (para mandar un único aviso al
 * grupo cuando se corta el OCR, no uno por cada foto bloqueada).
 */
export async function claimLimitNotice(): Promise<boolean> {
  const result = await redisConnection.set(
    monthKey(NOTICE_PREFIX),
    '1',
    'EX',
    KEY_TTL_SECONDS,
    'NX',
  );
  return result === 'OK';
}
