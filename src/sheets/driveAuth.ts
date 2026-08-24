import { google } from 'googleapis';
import { env } from '../config/env.js';

/**
 * Las Service Accounts no tienen cuota de almacenamiento propia en Drive (Google la eliminó
 * para evitar que se usen como storage gratis ilimitado): cualquier archivo que la service
 * account cree se factura contra su propia cuota, que es 0, aunque la carpeta destino sea
 * tuya y esté compartida con permiso de Editor. La única forma gratuita de subir archivos que
 * cuenten contra tu cuota (15GB gratis) es autenticarse como vos mismo vía OAuth. Por eso Drive
 * usa este cliente OAuth y no el `googleAuth` (service account) que usan los Sheets — ahí no
 * hace falta porque editar filas de un Sheet existente no consume storage.
 */
export const driveOAuthClient = new google.auth.OAuth2(
  env.GOOGLE_OAUTH_CLIENT_ID,
  env.GOOGLE_OAUTH_CLIENT_SECRET,
);

driveOAuthClient.setCredentials({ refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN });
