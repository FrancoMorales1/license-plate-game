import { describe, expect, it } from 'vitest';
import { findPatenteRowIndex } from './patentesSheet.js';

describe('findPatenteRowIndex', () => {
  const rows = [
    ['Franco', '2026-08-24T10:00:00.000Z', 'ABC123', '', 'https://drive/1'],
    ['Nico', '2026-08-24T11:00:00.000Z', 'AB123CD', '5', 'https://drive/2'],
  ];

  it('encuentra la fila que matchea jugador + fecha-hora + patente', () => {
    expect(
      findPatenteRowIndex(rows, {
        jugador: 'Nico',
        fechaHora: '2026-08-24T11:00:00.000Z',
        patente: 'AB123CD',
      }),
    ).toBe(1);
  });

  it('devuelve -1 si no hay match exacto', () => {
    expect(
      findPatenteRowIndex(rows, {
        jugador: 'Nico',
        fechaHora: '2026-08-24T11:00:00.000Z',
        patente: 'ZZZ999',
      }),
    ).toBe(-1);
  });

  it('devuelve -1 con lista vacía', () => {
    expect(findPatenteRowIndex([], { jugador: 'Franco', fechaHora: 'x', patente: 'ABC123' })).toBe(
      -1,
    );
  });
});
