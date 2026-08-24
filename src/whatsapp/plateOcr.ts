import { ImageAnnotatorClient } from '@google-cloud/vision';
import { env } from '../config/env.js';
import { extractPlate } from './plateParser.js';

const client = new ImageAnnotatorClient({ keyFilename: env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH });

/**
 * Fallback para cuando el caption no trae la patente: le pasa la foto entera (auto, calle,
 * fondo) a Google Cloud Vision OCR y busca un patrón de patente en todo el texto que detecte.
 * Reusa la misma Service Account que Sheets (Vision no tiene el problema de cuota de Drive,
 * no crea archivos).
 */
export async function extractPlateFromImage(buffer: Buffer): Promise<string | null> {
  const [result] = await client.textDetection({ image: { content: buffer } });
  const text = result.fullTextAnnotation?.text ?? '';
  return extractPlate(text);
}
