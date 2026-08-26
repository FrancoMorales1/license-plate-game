import { Worker, type Job } from 'bullmq';
import { redisConnection } from './connection.js';
import { SHEET_QUEUE_NAME } from './sheetQueue.js';
import { logger } from '../logger.js';
import type { SheetJobData } from '../types.js';
import { recordPatente } from '../sheets/patentesSheet.js';
import { upsertJugador } from '../sheets/jugadoresSheet.js';

async function process(job: Job<SheetJobData>): Promise<void> {
  const { data } = job;

  switch (data.type) {
    case 'UPSERT_JUGADOR':
      await upsertJugador(data.data);
      return;

    case 'APPEND_PATENTE':
      await recordPatente(data.data);
      return;
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
