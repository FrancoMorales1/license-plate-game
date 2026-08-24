import { downloadMediaMessage, type WAMessage, type WASocket } from '@whiskeysockets/baileys';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import { extractPlate } from './plateParser.js';
import { messageTimestampToIso } from './timestamp.js';
import { saveMessage } from './messageStore.js';
import { uploadPhoto } from '../sheets/driveClient.js';
import { enqueueSheetJob } from '../queue/sheetQueue.js';
import { sendScorePoll } from './pollHandler.js';

export function registerMessageHandler(sock: WASocket): void {
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      saveMessage(msg.key.id, msg.message);
    }

    void handleUpsert(sock, messages).catch((err: unknown) => {
      logger.error({ err }, 'Error procesando un mensaje entrante');
    });
  });
}

async function handleUpsert(sock: WASocket, messages: WAMessage[]): Promise<void> {
  for (const msg of messages) {
    if (msg.key.remoteJid !== env.WHATSAPP_GROUP_JID) continue;

    const imageMessage = msg.message?.imageMessage;
    if (!imageMessage) continue;

    const patente = extractPlate(imageMessage.caption ?? '');
    if (!patente) {
      logger.debug(
        { messageId: msg.key.id },
        'Foto sin patente reconocible en el caption, se ignora',
      );
      continue;
    }

    // Si la foto la mandó el celu vinculado al bot (fromMe), Baileys no completa pushName ni
    // participant como en los mensajes de terceros: el nombre sale del perfil de la sesión.
    const jugador = msg.key.fromMe
      ? (sock.user?.name ?? 'Vos')
      : msg.pushName || msg.key.participant || 'desconocido';
    const fechaHora = messageTimestampToIso(msg.messageTimestamp);

    logger.info({ jugador, patente }, 'Nueva foto de patente detectada');

    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    const { viewUrl } = await uploadPhoto(buffer, `${patente}-${fechaHora}.jpg`, 'image/jpeg');

    await enqueueSheetJob({ type: 'UPSERT_JUGADOR', data: { jugador, fechaHora } });
    await enqueueSheetJob({
      type: 'APPEND_PATENTE',
      data: { jugador, fechaHora, patente, foto: viewUrl },
    });

    await sendScorePoll(sock, { jugador, patente, fechaHora, groupJid: env.WHATSAPP_GROUP_JID });
  }
}
