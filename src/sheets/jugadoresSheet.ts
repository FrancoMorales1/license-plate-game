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

// El total no lo calcula la app: es una fórmula de Sheet que suma, para el jugador de esa
// misma fila, todas sus filas en "Patentes". INDIRECT("A"&ROW()) apunta a la columna Jugador de
// la propia fila sin necesitar saber de antemano en qué fila va a quedar el append. El Sheet
// tiene locale es_ES, que usa ";" como separador de argumentos (no ",").
const PUNTAJE_TOTAL_FORMULA = '=SUMIF(Patentes!A:A;INDIRECT("A"&ROW());Patentes!D:D)';

export async function upsertJugador(data: { jugador: string; fechaHora: string }): Promise<void> {
  const rows = await getValues(`${JUGADORES_SHEET_NAME}!A${FIRST_DATA_ROW}:D`);
  const index = findJugadorRowIndex(rows, data.jugador);

  if (index === -1) {
    await appendValues(`${JUGADORES_SHEET_NAME}!A:D`, [
      data.jugador,
      data.fechaHora,
      data.fechaHora,
      PUNTAJE_TOTAL_FORMULA,
    ]);
    return;
  }

  const sheetRow = index + FIRST_DATA_ROW;
  await updateValues(`${JUGADORES_SHEET_NAME}!C${sheetRow}`, [data.fechaHora]);
}
