import type { ScoreOption } from '../types.js';

export const POLL_NAME = '¿Cómo calificás esta patente?';

export const SCORE_OPTIONS: readonly ScoreOption[] = [
  { label: '10 - Palabra exacta', score: 10 },
  { label: '3 - Palabra similar e insulto', score: 3 },
  { label: '2 - Palabra similar y random', score: 2 },
  { label: '1 - Patente random', score: 1 },
];
