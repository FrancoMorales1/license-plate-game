import { appendValues, getValues, updateValues } from './sheetsClient.js';

export const JUGADORES_SHEET_NAME = 'Jugadores';
const FIRST_DATA_ROW = 2;

/**
 * Busca, dentro de las filas de datos de "Jugadores" (sin el header), la fila del jugador.
 * Devuelve el índice dentro de `rows` (0-based) o -1 si no está.
 */
export function findJugadorRowIndex(rows: readonly string[][], jugador: string): number {
  return rows.findIndex((row) => row[0] === jugador);
}

export async function upsertJugador(data: { jugador: string; fechaHora: string }): Promise<void> {
  const rows = await getValues(`${JUGADORES_SHEET_NAME}!A${FIRST_DATA_ROW}:D`);
  const index = findJugadorRowIndex(rows, data.jugador);

  if (index === -1) {
    await appendValues(`${JUGADORES_SHEET_NAME}!A:D`, [
      data.jugador,
      data.fechaHora,
      data.fechaHora,
      0,
    ]);
    return;
  }

  const sheetRow = index + FIRST_DATA_ROW;
  await updateValues(`${JUGADORES_SHEET_NAME}!C${sheetRow}`, [data.fechaHora]);
}

export async function addPuntajeToJugador(data: {
  jugador: string;
  puntaje: number;
}): Promise<void> {
  const rows = await getValues(`${JUGADORES_SHEET_NAME}!A${FIRST_DATA_ROW}:D`);
  const index = findJugadorRowIndex(rows, data.jugador);

  if (index === -1) {
    throw new Error(`No se encontró a ${data.jugador} en "Jugadores" para sumarle el puntaje`);
  }

  const sheetRow = index + FIRST_DATA_ROW;
  const currentTotal = Number(rows[index]?.[3] ?? 0) || 0;
  await updateValues(`${JUGADORES_SHEET_NAME}!D${sheetRow}`, [currentTotal + data.puntaje]);
}
