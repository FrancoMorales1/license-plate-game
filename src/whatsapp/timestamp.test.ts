import { describe, expect, it } from 'vitest';
import { messageTimestampToIso } from './timestamp.js';

describe('messageTimestampToIso', () => {
  it('convierte un timestamp numérico (segundos) a ISO', () => {
    expect(messageTimestampToIso(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(messageTimestampToIso(1_700_000_000)).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it('convierte un objeto tipo Long (con toNumber) a ISO', () => {
    const longLike = { toNumber: () => 1_700_000_000 };
    expect(messageTimestampToIso(longLike)).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it('usa la hora actual si no hay timestamp (con precisión de segundos)', () => {
    const before = Date.now();
    const iso = messageTimestampToIso(null);
    const after = Date.now();
    const parsed = new Date(iso).getTime();
    // La función trunca a segundos (igual que el messageTimestamp de WhatsApp), por eso
    // se tolera hasta 1s de diferencia hacia abajo respecto a `before`.
    expect(parsed).toBeGreaterThanOrEqual(before - 1000);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});
