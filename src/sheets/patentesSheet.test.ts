import { describe, expect, it } from 'vitest';
import { computePatenteScore } from './patentesSheet.js';

describe('computePatenteScore', () => {
  it('da puntaje completo si la patente es nueva', () => {
    expect(computePatenteScore([], 'Franco', 'ABC123')).toBe(1);
  });

  it('da puntaje completo si la patente no está en el historial', () => {
    const rows = [['Franco', '2026-08-24T10:00:00.000Z', 'AB123CD', '1', 'https://drive/1']];
    expect(computePatenteScore(rows, 'Nico', 'ABC123')).toBe(1);
  });

  it('da la mitad si otro jugador ya cargó la misma patente', () => {
    const rows = [['Franco', '2026-08-24T10:00:00.000Z', 'ABC123', '1', 'https://drive/1']];
    expect(computePatenteScore(rows, 'Nico', 'ABC123')).toBe(0.5);
  });

  it('da 0 si el mismo jugador ya cargó esa patente antes', () => {
    const rows = [['Franco', '2026-08-24T10:00:00.000Z', 'ABC123', '1', 'https://drive/1']];
    expect(computePatenteScore(rows, 'Franco', 'ABC123')).toBe(0);
  });

  it('prioriza el 0 aunque otro jugador también haya cargado esa patente', () => {
    const rows = [
      ['Franco', '2026-08-24T10:00:00.000Z', 'ABC123', '1', 'https://drive/1'],
      ['Nico', '2026-08-24T11:00:00.000Z', 'ABC123', '0.5', 'https://drive/2'],
    ];
    expect(computePatenteScore(rows, 'Franco', 'ABC123')).toBe(0);
    expect(computePatenteScore(rows, 'Nico', 'ABC123')).toBe(0);
    expect(computePatenteScore(rows, 'Sole', 'ABC123')).toBe(0.5);
  });
});
