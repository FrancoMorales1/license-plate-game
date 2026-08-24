import 'dotenv/config';
import makeWASocket, {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';

/**
 * Script standalone para conseguir el JID de un grupo de WhatsApp: se conecta, y por cada
 * mensaje que llega de un grupo imprime su nombre y JID. No depende del resto del .env
 * (GOOGLE_*, WHATSAPP_GROUP_JID) porque se usa justamente para completarlo.
 *
 * Uso: pnpm get-group-jid
 */

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR ?? './auth';
const logger = pino({ level: 'silent' });

async function main(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, qr }) => {
    if (qr) {
      qrcodeTerminal.generate(qr, { small: true });
      console.log('Escaneá el QR con WhatsApp (Dispositivos vinculados) para conectar.');
    }
    if (connection === 'open') {
      console.log('Conectado. Mandá cualquier mensaje al grupo que querés identificar...\n');
    }
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      if (!jid?.endsWith('@g.us')) continue;

      sock
        .groupMetadata(jid)
        .then((meta) => console.log(`Grupo: "${meta.subject}"  →  JID: ${jid}`))
        .catch(() => console.log(`Grupo (sin nombre disponible)  →  JID: ${jid}`));
    }
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
