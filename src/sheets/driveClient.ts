import { Readable } from 'node:stream';
import { google, type drive_v3 } from 'googleapis';
import { driveOAuthClient } from './driveAuth.js';
import { env } from '../config/env.js';

const drive: drive_v3.Drive = google.drive({ version: 'v3', auth: driveOAuthClient });

export interface UploadedPhoto {
  fileId: string;
  viewUrl: string;
}

export async function uploadPhoto(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<UploadedPhoto> {
  const created = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink',
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error('Google Drive no devolvió un id para el archivo subido');
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId,
    viewUrl: created.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
  };
}
