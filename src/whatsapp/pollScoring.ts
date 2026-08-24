import { SCORE_OPTIONS } from './scoreOptions.js';
import type { ScoreOption } from '../types.js';

export interface VoteAggregationEntry {
  name: string;
  voters: string[];
}

/**
 * Puntaje final de la encuesta: la opción más votada (plurality).
 * Si hay empate entre las opciones más votadas, se promedian sus puntajes.
 * Si nadie votó, el puntaje es 0.
 */
export function computeWinningScore(
  aggregation: ReadonlyArray<VoteAggregationEntry>,
  options: readonly ScoreOption[] = SCORE_OPTIONS,
): number {
  const counted = aggregation
    .map((entry) => ({
      score: options.find((option) => option.label === entry.name)?.score,
      voters: entry.voters.length,
    }))
    .filter(
      (entry): entry is { score: number; voters: number } =>
        entry.score !== undefined && entry.voters > 0,
    );

  if (counted.length === 0) return 0;

  const maxVoters = Math.max(...counted.map((entry) => entry.voters));
  const winners = counted.filter((entry) => entry.voters === maxVoters);
  const total = winners.reduce((sum, winner) => sum + winner.score, 0);
  return total / winners.length;
}
