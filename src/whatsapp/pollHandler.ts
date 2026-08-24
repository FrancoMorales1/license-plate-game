import { getAggregateVotesInPollMessage, type WASocket, type proto } from '@whiskeysockets/baileys';
import { logger } from '../logger.js';
import { env } from '../config/env.js';
import { getStoredMessage, saveMessage } from './messageStore.js';
import { addPollUpdate, getPollUpdates, clearPollUpdates } from './pollVoteStore.js';
import { getPoll, savePoll, deletePoll, type PollMeta } from './pollStore.js';
import { SCORE_OPTIONS, POLL_NAME } from './scoreOptions.js';
import { enqueueSheetJob, sheetQueue } from '../queue/sheetQueue.js';
import { computeWinningScore } from './pollScoring.js';

export interface PollContext {
  jugador: string;
  patente: string;
  fechaHora: string;
  groupJid: string;
}

function closeJobId(pollMessageId: string): string {
  return `close-${pollMessageId}`;
}

export async function sendScorePoll(sock: WASocket, ctx: PollContext): Promise<void> {
  const sent = await sock.sendMessage(ctx.groupJid, {
    poll: {
      name: POLL_NAME,
      values: SCORE_OPTIONS.map((option) => option.label),
      selectableCount: 1,
    },
  });

  const pollMessageId = sent?.key?.id;
  if (!sent?.message || !pollMessageId) {
    logger.error({ ctx }, 'No se pudo enviar la encuesta de puntaje');
    return;
  }

  saveMessage(pollMessageId, sent.message);

  const meta: PollMeta = {
    jugador: ctx.jugador,
    patente: ctx.patente,
    fechaHora: ctx.fechaHora,
    groupJid: ctx.groupJid,
    options: SCORE_OPTIONS,
  };
  await savePoll(pollMessageId, meta);

  await enqueueSheetJob(
    { type: 'CLOSE_POLL_AND_SCORE', data: { pollMessageId } },
    { delay: env.POLL_CLOSE_HOURS * 60 * 60 * 1000, jobId: closeJobId(pollMessageId) },
  );
}

export function registerPollVoteListener(sock: WASocket): void {
  sock.ev.on('messages.update', (updates) => {
    void handlePollUpdates(sock, updates).catch((err: unknown) => {
      logger.error({ err }, 'Error procesando votos de una encuesta');
    });
  });
}

async function handlePollUpdates(
  sock: WASocket,
  updates: Array<{ key: proto.IMessageKey; update: Partial<proto.IWebMessageInfo> }>,
): Promise<void> {
  for (const { key, update } of updates) {
    const pollMessageId = key.id;
    if (!update.pollUpdates || !pollMessageId) continue;

    const meta = await getPoll(pollMessageId);
    if (!meta) continue;

    for (const pollUpdate of update.pollUpdates) {
      addPollUpdate(pollMessageId, pollUpdate);
    }

    const creationMessage = getStoredMessage(pollMessageId);
    if (!creationMessage) {
      logger.warn(
        { pollMessageId },
        'No se encontró el mensaje original del poll para agregar votos',
      );
      continue;
    }

    const aggregation = getAggregateVotesInPollMessage({
      message: creationMessage,
      pollUpdates: getPollUpdates(pollMessageId),
    });
    const totalVoters = aggregation.reduce((sum, option) => sum + option.voters.length, 0);

    const groupMetadata = await sock.groupMetadata(meta.groupJid);
    const botId = sock.user?.id;
    const memberCount = groupMetadata.participants.filter((p) => p.id !== botId).length;

    if (memberCount > 0 && totalVoters >= memberCount) {
      await promoteCloseJob(pollMessageId);
    }
  }
}

async function promoteCloseJob(pollMessageId: string): Promise<void> {
  const job = await sheetQueue.getJob(closeJobId(pollMessageId));
  if (!job) return;
  try {
    if (await job.isDelayed()) {
      await job.promote();
    }
  } catch (err) {
    logger.debug(
      { err, pollMessageId },
      'No se pudo adelantar el cierre de la encuesta (probablemente ya se estaba cerrando)',
    );
  }
}

export interface PollResult {
  jugador: string;
  patente: string;
  fechaHora: string;
  puntaje: number;
}

export async function resolvePollResult(pollMessageId: string): Promise<PollResult | null> {
  const meta = await getPoll(pollMessageId);
  if (!meta) return null;

  const creationMessage = getStoredMessage(pollMessageId);
  const pollUpdates = getPollUpdates(pollMessageId);

  const aggregation = creationMessage
    ? getAggregateVotesInPollMessage({ message: creationMessage, pollUpdates })
    : [];

  const puntaje = computeWinningScore(aggregation, meta.options);

  return { jugador: meta.jugador, patente: meta.patente, fechaHora: meta.fechaHora, puntaje };
}

export async function finishPoll(pollMessageId: string): Promise<void> {
  await deletePoll(pollMessageId);
  clearPollUpdates(pollMessageId);
}
