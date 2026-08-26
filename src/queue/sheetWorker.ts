import { Worker, type Job } from 'bullmq';
import type { WAMessageKey } from '@whiskeysockets/baileys';
import { redisConnection } from './connection.js';
import { SHEET_QUEUE_NAME } from './sheetQueue.js';
import { logger } from '../logger.js';
import { env } from '../config/env.js';
import type { SheetJobData } from '../types.js';
import { recordPatente } from '../sheets/patentesSheet.js';
import { upsertJugador } from '../sheets/jugadoresSheet.js';
import { getActiveSock } from '../whatsapp/socket.js';

const PROCESSED_REACTION = '✅';

async function process(job: Job<SheetJobData>): Promise<void> {
  const { data } = job;

  switch (data.type) {
    case 'UPSERT_JUGADOR':
      await upsertJugador(data.data);
      return;

    case 'APPEND_PATENTE':
      await recordPatente(data.data);
      await reactToMessage(data.data.messageKey);
      return;
  }
}

// La reacción es un plus visual, no algo de lo que dependa el puntaje: si falla (ej. el socket
// se reconectó justo en el medio) se loguea pero no se reintenta el job por esto.
async function reactToMessage(key: WAMessageKey): Promise<void> {
  const sock = getActiveSock();
  if (!sock) return;

  try {
    await sock.sendMessage(env.WHATSAPP_GROUP_JID, {
      react: { text: PROCESSED_REACTION, key },
    });
  } catch (err) {
    logger.warn({ err }, 'No se pudo reaccionar al mensaje procesado');
  }
}

export const sheetWorker = new Worker<SheetJobData>(SHEET_QUEUE_NAME, process, {
  connection: redisConnection,
  concurrency: 1,
});

sheetWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id, type: job.data.type }, 'Job de sheet completado');
});

sheetWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, type: job?.data.type, err }, 'Falló un job de escritura al sheet');
});
