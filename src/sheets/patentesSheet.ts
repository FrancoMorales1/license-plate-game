import { appendValues, getValues, updateValues } from './sheetsClient.js';

export const PATENTES_SHEET_NAME = 'Patentes';
const FIRST_DATA_ROW = 2;

export interface PatenteKey {
  jugador: string;
  fechaHora: string;
  patente: string;
}

/**
 * Busca, dentro de las filas de datos de "Patentes" (sin el header), la fila que matchea
 * jugador + fecha-hora + patente. Devuelve el índice dentro de `rows` (0-based) o -1 si no está.
 */
export function findPatenteRowIndex(rows: readonly string[][], key: PatenteKey): number {
  return rows.findIndex(
    (row) => row[0] === key.jugador && row[1] === key.fechaHora && row[2] === key.patente,
  );
}

export async function appendPatenteRow(data: {
  jugador: string;
  fechaHora: string;
  patente: string;
  foto: string;
}): Promise<void> {
  await appendValues(`${PATENTES_SHEET_NAME}!A:E`, [
    data.jugador,
    data.fechaHora,
    data.patente,
    '',
    data.foto,
  ]);
}

export async function setPuntajeForRow(key: PatenteKey & { puntaje: number }): Promise<void> {
  const rows = await getValues(`${PATENTES_SHEET_NAME}!A${FIRST_DATA_ROW}:E`);
  const index = findPatenteRowIndex(rows, key);
  if (index === -1) {
    throw new Error(
      `No se encontró en "Patentes" la fila de ${key.jugador} / ${key.patente} / ${key.fechaHora} para actualizar el puntaje`,
    );
  }

  const sheetRow = index + FIRST_DATA_ROW;
  await updateValues(`${PATENTES_SHEET_NAME}!D${sheetRow}`, [key.puntaje]);
}
