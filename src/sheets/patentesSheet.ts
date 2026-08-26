import { appendValues, getValues } from './sheetsClient.js';

export const PATENTES_SHEET_NAME = 'Patentes';
const FIRST_DATA_ROW = 2;

export const FULL_SCORE = 1;
const HALF_SCORE = FULL_SCORE / 2;

/**
 * Puntaje de una patente nueva: si nadie la cargó antes, puntaje completo; si ya la cargó el
 * mismo jugador, 0 (no se puede cobrar dos veces por la misma patente); si ya la cargó otro
 * jugador, la mitad.
 */
export function computePatenteScore(
  rows: readonly string[][],
  jugador: string,
  patente: string,
): number {
  const matches = rows.filter((row) => row[2] === patente);
  if (matches.length === 0) return FULL_SCORE;
  if (matches.some((row) => row[0] === jugador)) return 0;
  return HALF_SCORE;
}

/**
 * Lee el historial de "Patentes", calcula el puntaje de esta patente para este jugador y
 * agrega la fila ya con el puntaje final. El acumulado en "Jugadores" no lo escribe la app: es
 * una fórmula de Sheet que suma esta columna (ver PUNTAJE_TOTAL_FORMULA en jugadoresSheet.ts).
 */
export async function recordPatente(data: {
  jugador: string;
  fechaHora: string;
  patente: string;
  foto: string;
}): Promise<void> {
  const rows = await getValues(`${PATENTES_SHEET_NAME}!A${FIRST_DATA_ROW}:E`);
  const puntaje = computePatenteScore(rows, data.jugador, data.patente);

  await appendValues(`${PATENTES_SHEET_NAME}!A:E`, [
    data.jugador,
    data.fechaHora,
    data.patente,
    puntaje,
    data.foto,
  ]);
}
