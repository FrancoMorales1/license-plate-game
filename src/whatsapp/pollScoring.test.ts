import { describe, expect, it } from 'vitest';
import { computeWinningScore } from './pollScoring.js';
import { SCORE_OPTIONS } from './scoreOptions.js';

describe('computeWinningScore', () => {
  it('devuelve 0 si nadie votó', () => {
    expect(computeWinningScore([])).toBe(0);
  });

  it('devuelve 0 si las opciones no tienen votantes', () => {
    const aggregation = SCORE_OPTIONS.map((option) => ({ name: option.label, voters: [] }));
    expect(computeWinningScore(aggregation)).toBe(0);
  });

  it('devuelve el puntaje de la opción más votada (plurality)', () => {
    const aggregation = [
      { name: '10 - Palabra exacta', voters: ['a', 'b', 'c'] },
      { name: '1 - Patente random', voters: ['d'] },
    ];
    expect(computeWinningScore(aggregation)).toBe(10);
  });

  it('promedia los puntajes cuando hay empate en la cantidad de votos', () => {
    const aggregation = [
      { name: '10 - Palabra exacta', voters: ['a'] },
      { name: '2 - Palabra similar y random', voters: ['b'] },
    ];
    expect(computeWinningScore(aggregation)).toBe(6);
  });

  it('promedia entre más de dos opciones empatadas', () => {
    const aggregation = [
      { name: '10 - Palabra exacta', voters: ['a'] },
      { name: '3 - Palabra similar e insulto', voters: ['b'] },
      { name: '2 - Palabra similar y random', voters: ['c'] },
      { name: '1 - Patente random', voters: [] },
    ];
    expect(computeWinningScore(aggregation)).toBeCloseTo(5);
  });

  it('ignora opciones que no matchean con la escala configurada', () => {
    const aggregation = [
      { name: 'opción desconocida', voters: ['a', 'b'] },
      { name: '1 - Patente random', voters: ['c'] },
    ];
    expect(computeWinningScore(aggregation)).toBe(1);
  });
});
