type LongLike = { toNumber: () => number };

function isLongLike(value: unknown): value is LongLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LongLike).toNumber === 'function'
  );
}

/**
 * Convierte el `messageTimestamp` de Baileys (segundos epoch, como number o Long) a un ISO string.
 */
export function messageTimestampToIso(timestamp: number | LongLike | null | undefined): string {
  const seconds = isLongLike(timestamp)
    ? timestamp.toNumber()
    : (timestamp ?? Math.floor(Date.now() / 1000));
  return new Date(seconds * 1000).toISOString();
}
