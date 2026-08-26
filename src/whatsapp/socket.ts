import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import { env } from '../config/env.js';
import { logger } from '../logger.js';
import { getStoredMessage } from './messageStore.js';
import { registerMessageHandler } from './messageHandler.js';

let activeSock: WASocket | undefined;

/**
 * El socket activo, para poder mandar mensajes (ej. reacciones) desde fuera del flujo de
 * `messages.upsert` (como el worker de Sheets). Se reasigna en cada reconexión, así que siempre
 * devuelve el socket vigente en vez de uno posiblemente cerrado.
 */
export function getActiveSock(): WASocket | undefined {
  return activeSock;
}

export async function createWhatsAppSocket(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(env.WHATSAPP_AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    getMessage: async (key) => getStoredMessage(key.id),
  });

  activeSock = sock;
  sock.ev.on('creds.update', saveCreds);
  registerMessageHandler(sock);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcodeTerminal.generate(qr, { small: true });
      logger.info(
        'Escaneá el QR de arriba con WhatsApp (Dispositivos vinculados) para conectar el bot.',
      );
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn({ statusCode, shouldReconnect }, 'Conexión de WhatsApp cerrada');
      if (shouldReconnect) {
        void createWhatsAppSocket();
      } else {
        logger.error(
          'Sesión cerrada (logged out). Borrá la carpeta de auth y volvé a escanear el QR.',
        );
      }
    } else if (connection === 'open') {
      logger.info('Conectado a WhatsApp');
    }
  });

  return sock;
}
