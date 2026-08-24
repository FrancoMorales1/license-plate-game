import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  WHATSAPP_GROUP_JID: z.string().min(1, 'WHATSAPP_GROUP_JID es requerido'),
  WHATSAPP_AUTH_DIR: z.string().default('./auth'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: z
    .string()
    .min(1, 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH es requerido'),
  GOOGLE_SHEET_ID: z.string().min(1, 'GOOGLE_SHEET_ID es requerido'),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1, 'GOOGLE_DRIVE_FOLDER_ID es requerido'),
  POLL_CLOSE_HOURS: z.coerce.number().positive().default(24),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
