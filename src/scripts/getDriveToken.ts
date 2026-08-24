import 'dotenv/config';
import http from 'node:http';
import { google } from 'googleapis';

/**
 * Script standalone para conseguir el refresh_token de OAuth que necesita driveClient.ts para
 * subir fotos como vos (ver src/sheets/driveAuth.ts sobre por qué no alcanza con la service
 * account). No depende del resto del .env porque se usa para completarlo.
 *
 * Uso: pnpm get-drive-token
 * Requiere GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET ya en el .env (un OAuth Client ID
 * tipo "Desktop app" creado en Google Cloud Console).
 */

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Faltan GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET en el .env.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log(
  '\nAbrí esta URL en el navegador, iniciá sesión con la cuenta de Google dueña de la carpeta de Drive y aceptá:\n',
);
console.log(authUrl);
console.log('\nEsperando la autorización...');

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400).end('Falta el parámetro "code".');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Listo, ya podés cerrar esta pestaña.</h1>');

  oauth2Client
    .getToken(code)
    .then(({ tokens }) => {
      if (!tokens.refresh_token) {
        console.error(
          '\nGoogle no devolvió un refresh_token. Si ya habías autorizado esta app antes, revocá' +
            ' el acceso en https://myaccount.google.com/permissions y volvé a correr el script.',
        );
        server.close(() => process.exit(1));
        return;
      }

      console.log('\n¡Listo! Copiá esta línea a tu .env:\n');
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
      server.close(() => process.exit(0));
    })
    .catch((err: unknown) => {
      console.error('\nError obteniendo el token:', err);
      server.close(() => process.exit(1));
    });
});

server.listen(PORT);
