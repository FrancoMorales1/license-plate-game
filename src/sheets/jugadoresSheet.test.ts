import { describe, expect, it } from 'vitest';
import { findJugadorRowIndex } from './jugadoresSheet.js';

describe('findJugadorRowIndex', () => {
  const rows = [
    ['Franco', '2026-01-01T00:00:00.000Z', '2026-08-20T00:00:00.000Z', '15'],
    ['Nico', '2026-02-01T00:00:00.000Z', '2026-08-24T00:00:00.000Z', '30'],
  ];

  it('encuentra la fila del jugador', () => {
    expect(findJugadorRowIndex(rows, 'Nico')).toBe(1);
  });

  it('devuelve -1 si el jugador no está', () => {
    expect(findJugadorRowIndex(rows, 'Alguien')).toBe(-1);
  });

  it('devuelve -1 con lista vacía', () => {
    expect(findJugadorRowIndex([], 'Franco')).toBe(-1);
  });
});
