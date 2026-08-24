import { downloadMediaMessage, type WAMessage, type WASocket } from '@whiskeysockets/baileys';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import { extractPlate } from './plateParser.js';
import { extractPlateFromImage } from './plateOcr.js';
import { messageTimestampToIso } from './timestamp.js';
import { saveMessage } from './messageStore.js';
import { uploadPhoto } from '../sheets/driveClient.js';
import { enqueueSheetJob } from '../queue/sheetQueue.js';

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

    // Primero se intenta con el caption (rápido, gratis, y sirve para corregir un OCR que
    // pudiera fallar); si no trae nada reconocible, se baja la foto y se prueba con OCR sobre
    // la imagen completa.
    let patente = extractPlate(imageMessage.caption ?? '');
    let source: 'caption' | 'ocr' = 'caption';
    const buffer = await downloadMediaMessage(msg, 'buffer', {});

    if (!patente) {
      patente = await extractPlateFromImage(buffer);
      source = 'ocr';
    }

    if (!patente) {
      logger.debug(
        { messageId: msg.key.id },
        'No se reconoció ninguna patente ni en el caption ni por OCR, se ignora',
      );
      continue;
    }

    // Si la foto la mandó el celu vinculado al bot (fromMe), Baileys no completa pushName ni
    // participant como en los mensajes de terceros: el nombre sale del perfil de la sesión.
    const jugador = msg.key.fromMe
      ? (sock.user?.name ?? 'Vos')
      : msg.pushName || msg.key.participant || 'desconocido';
    const fechaHora = messageTimestampToIso(msg.messageTimestamp);

    logger.info({ jugador, patente, source }, 'Nueva foto de patente detectada');

    const { viewUrl } = await uploadPhoto(buffer, `${patente}-${fechaHora}.jpg`, 'image/jpeg');

    await enqueueSheetJob({ type: 'UPSERT_JUGADOR', data: { jugador, fechaHora } });
    await enqueueSheetJob({
      type: 'APPEND_PATENTE',
      data: { jugador, fechaHora, patente, foto: viewUrl },
    });
  }
}
