import type { proto } from '@whiskeysockets/baileys';

const updatesByPoll = new Map<string, proto.IPollUpdate[]>();

export function addPollUpdate(pollMessageId: string, update: proto.IPollUpdate): void {
  const existing = updatesByPoll.get(pollMessageId) ?? [];
  existing.push(update);
  updatesByPoll.set(pollMessageId, existing);
}

export function getPollUpdates(pollMessageId: string): proto.IPollUpdate[] {
  return updatesByPoll.get(pollMessageId) ?? [];
}

export function clearPollUpdates(pollMessageId: string): void {
  updatesByPoll.delete(pollMessageId);
}
