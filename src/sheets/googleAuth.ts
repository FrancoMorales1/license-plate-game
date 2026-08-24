import { google } from 'googleapis';
import { env } from '../config/env.js';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export const googleAuth = new google.auth.GoogleAuth({
  keyFile: env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: SCOPES,
});
