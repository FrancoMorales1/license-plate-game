import { downloadMediaMessage, type WAMessage, type WASocket } from '@whiskeysockets/baileys';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import { extractPlate } from './plateParser.js';
import { extractPlateFromImage } from './plateOcr.js';
import { hasVisionBudget, claimLimitNotice } from './visionBudget.js';
import { hashImage } from './imageHash.js';
import { claimImage } from './imageDedup.js';
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

    const buffer = await downloadMediaMessage(msg, 'buffer', {});

    // Se descarta por hash antes de gastar OCR/Drive en una foto ya procesada (reenvíos,
    // duplicados por reconexión de WhatsApp, etc.).
    const isNewImage = await claimImage(hashImage(buffer));
    if (!isNewImage) {
      logger.debug({ messageId: msg.key.id }, 'Imagen ya procesada antes (mismo hash), se ignora');
      continue;
    }

    // Primero se intenta con el caption (rápido, gratis, y sirve para corregir un OCR que
    // pudiera fallar); si no trae nada reconocible, se prueba con OCR sobre la imagen completa.
    let patente = extractPlate(imageMessage.caption ?? '');
    let source: 'caption' | 'ocr' = 'caption';

    if (!patente) {
      if (await hasVisionBudget()) {
        patente = await extractPlateFromImage(buffer);
        source = 'ocr';
      } else {
        logger.warn('Límite mensual de Vision OCR alcanzado, se salta el OCR de esta foto');
        if (await claimLimitNotice()) {
          await sock.sendMessage(env.WHATSAPP_GROUP_JID, {
            text:
              `⚠️ Se alcanzó el límite mensual gratuito de lectura automática de patentes ` +
              `(${env.VISION_MONTHLY_LIMIT} fotos). Hasta el mes que viene, escribí la patente ` +
              `en el mensaje junto con la foto para que se guarde.`,
          });
        }
      }
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
