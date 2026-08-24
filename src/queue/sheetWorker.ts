import { Worker, type Job } from 'bullmq';
import { redisConnection } from './connection.js';
import { SHEET_QUEUE_NAME } from './sheetQueue.js';
import { logger } from '../logger.js';
import type { SheetJobData } from '../types.js';
import { appendPatenteRow, setPuntajeForRow } from '../sheets/patentesSheet.js';
import { upsertJugador, addPuntajeToJugador } from '../sheets/jugadoresSheet.js';
import { resolvePollResult, finishPoll } from '../whatsapp/pollHandler.js';

async function process(job: Job<SheetJobData>): Promise<void> {
  const { data } = job;

  switch (data.type) {
    case 'APPEND_PATENTE':
      await appendPatenteRow(data.data);
      return;

    case 'UPSERT_JUGADOR':
      await upsertJugador(data.data);
      return;

    case 'CLOSE_POLL_AND_SCORE': {
      const { pollMessageId } = data.data;
      const result = await resolvePollResult(pollMessageId);
      if (!result) {
        logger.warn(
          { pollMessageId },
          'La encuesta ya no tiene metadata al cerrarse (¿se cerró dos veces?)',
        );
        return;
      }

      await setPuntajeForRow({
        jugador: result.jugador,
        fechaHora: result.fechaHora,
        patente: result.patente,
        puntaje: result.puntaje,
      });
      await addPuntajeToJugador({ jugador: result.jugador, puntaje: result.puntaje });
      await finishPoll(pollMessageId);
      return;
    }
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
