import { redisConnection } from '../queue/connection.js';

const PROCESSED_HASHES_SET = 'patentes-bot:processed-image-hashes';

/**
 * Registra el hash de la imagen si es la primera vez que se ve. Devuelve true si es nueva
 * (había que procesarla) o false si ya se había procesado antes (SADD es atómico, así que dos
 * fotos idénticas llegando casi al mismo tiempo no se cuelan las dos).
 */
export async function claimImage(hash: string): Promise<boolean> {
  const added = await redisConnection.sadd(PROCESSED_HASHES_SET, hash);
  return added === 1;
}
