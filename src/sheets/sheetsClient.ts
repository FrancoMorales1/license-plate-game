import { google, type sheets_v4 } from 'googleapis';
import { googleAuth } from './googleAuth.js';
import { env } from '../config/env.js';

const sheets: sheets_v4.Sheets = google.sheets({ version: 'v4', auth: googleAuth });

export async function getValues(range: string): Promise<string[][]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range,
  });
  return (response.data.values ?? []) as string[][];
}

export async function appendValues(range: string, row: unknown[]): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function updateValues(range: string, row: unknown[]): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}
