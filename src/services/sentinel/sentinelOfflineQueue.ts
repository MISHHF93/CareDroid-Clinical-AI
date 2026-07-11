/**
 * Offline queue for Sentinel alarm acknowledgements and AI reviews.
 * Replays when backend becomes reachable.
 */

export type SentinelOfflineAction =
  | Readonly<{
      id: string;
      kind: 'alarm_ack';
      alarmId: string;
      reason?: string;
      enqueuedAt: string;
    }>
  | Readonly<{
      id: string;
      kind: 'ai_review';
      recommendationId: string;
      status: 'accepted' | 'rejected' | 'modified';
      enqueuedAt: string;
    }>;

const QUEUE_KEY = 'caredroid.sentinel.offlineQueue.v1';

function readQueue(): SentinelOfflineAction[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SentinelOfflineAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: readonly SentinelOfflineAction[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-100)));
  } catch {
    // ignore
  }
}

function newId(): string {
  return `soff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function enqueueSentinelOfflineAction(
  action: Omit<SentinelOfflineAction, 'id' | 'enqueuedAt'> & { enqueuedAt?: string },
): SentinelOfflineAction {
  const full = {
    ...action,
    id: newId(),
    enqueuedAt: action.enqueuedAt || new Date().toISOString(),
  } as SentinelOfflineAction;
  const queue = readQueue();
  queue.push(full);
  writeQueue(queue);
  return full;
}

export function listSentinelOfflineActions(): readonly SentinelOfflineAction[] {
  return Object.freeze([...readQueue()]);
}

export function clearSentinelOfflineAction(id: string): void {
  writeQueue(readQueue().filter((a) => a.id !== id));
}

export async function flushSentinelOfflineQueue(handlers: {
  acknowledgeAlarm: (alarmId: string, reason?: string) => Promise<{ ok: boolean }>;
  reviewAi: (
    id: string,
    status: 'accepted' | 'rejected' | 'modified',
  ) => Promise<{ ok: boolean }>;
}): Promise<{ flushed: number; remaining: number }> {
  const queue = readQueue();
  let flushed = 0;
  const remaining: SentinelOfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.kind === 'alarm_ack') {
        const result = await handlers.acknowledgeAlarm(action.alarmId, action.reason);
        if (result.ok) flushed += 1;
        else remaining.push(action);
      } else if (action.kind === 'ai_review') {
        const result = await handlers.reviewAi(action.recommendationId, action.status);
        if (result.ok) flushed += 1;
        else remaining.push(action);
      }
    } catch {
      remaining.push(action);
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
