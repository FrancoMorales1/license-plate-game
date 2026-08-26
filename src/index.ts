import { env } from './config/env.js';
import { logger } from './logger.js';
import { createWhatsAppSocket } from './whatsapp/socket.js';
import { cleanupOldMessages } from './whatsapp/messageStore.js';
import './queue/sheetWorker.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

async function main(): Promise<void> {
  logger.info({ groupJid: env.WHATSAPP_GROUP_JID }, 'Iniciando bot de patentes');

  await createWhatsAppSocket();

  setInterval(cleanupOldMessages, CLEANUP_INTERVAL_MS);
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Error fatal al iniciar el bot');
  process.exit(1);
});
