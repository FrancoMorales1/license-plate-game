import { redisConnection } from '../queue/connection.js';
import type { ScoreOption } from '../types.js';

export interface PollMeta {
  jugador: string;
  patente: string;
  fechaHora: string;
  groupJid: string;
  options: readonly ScoreOption[];
}

const POLL_PREFIX = 'poll:';
const POLL_TTL_SECONDS = 26 * 60 * 60;

function key(pollMessageId: string): string {
  return `${POLL_PREFIX}${pollMessageId}`;
}

export async function savePoll(pollMessageId: string, meta: PollMeta): Promise<void> {
  await redisConnection.set(key(pollMessageId), JSON.stringify(meta), 'EX', POLL_TTL_SECONDS);
}

export async function getPoll(pollMessageId: string): Promise<PollMeta | null> {
  const raw = await redisConnection.get(key(pollMessageId));
  return raw ? (JSON.parse(raw) as PollMeta) : null;
}

/**
 * Marca el poll como cerrado de forma atómica. Devuelve true solo la primera vez
 * (si ya estaba cerrado, devuelve false) para evitar procesar el cierre dos veces
 * cuando coinciden el timer de 24hs y el chequeo de "votaron todos".
 */
export async function markClosed(pollMessageId: string): Promise<boolean> {
  const closedKey = `${key(pollMessageId)}:closed`;
  const result = await redisConnection.set(closedKey, '1', 'EX', POLL_TTL_SECONDS, 'NX');
  return result === 'OK';
}

export async function deletePoll(pollMessageId: string): Promise<void> {
  await redisConnection.del(key(pollMessageId), `${key(pollMessageId)}:closed`);
}
