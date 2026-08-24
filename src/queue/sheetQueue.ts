import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import type { SheetJobData } from '../types.js';

export const SHEET_QUEUE_NAME = 'sheet-writes';

export const sheetQueue = new Queue<SheetJobData>(SHEET_QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueSheetJob(
  data: SheetJobData,
  options?: { delay?: number; jobId?: string },
): Promise<void> {
  await sheetQueue.add(data.type, data, {
    delay: options?.delay,
    jobId: options?.jobId,
    removeOnComplete: true,
    removeOnFail: 100,
  });
}
