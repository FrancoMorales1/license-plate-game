import type { proto } from '@whiskeysockets/baileys';

interface StoredMessage {
  message: proto.IMessage;
  storedAt: number;
}

const MAX_AGE_MS = 30 * 60 * 60 * 1000;

const store = new Map<string, StoredMessage>();

export function saveMessage(
  id: string | null | undefined,
  message: proto.IMessage | null | undefined,
): void {
  if (!id || !message) return;
  store.set(id, { message, storedAt: Date.now() });
}

export function getStoredMessage(id: string | null | undefined): proto.IMessage | undefined {
  if (!id) return undefined;
  return store.get(id)?.message;
}

export function cleanupOldMessages(): void {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [id, entry] of store) {
    if (entry.storedAt < cutoff) store.delete(id);
  }
}
