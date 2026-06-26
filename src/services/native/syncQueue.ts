// TypeScript replacement for SyncManager.kt (Room + PendingMessageDao)
// Stores offline-queued messages in localStorage and exposes flush helpers
// that integrate with the existing OfflineProvider and emergencyOperationalSync.
// The Room/DAO layer is superseded by IndexedDB (Dexie) for structured persistence.

interface QueuedMessage {
  id: string;
  conversationId: string | null;
  content: string;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'caredroid_pending_messages';
const MAX_RETRIES = 3;

function loadQueue(): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedMessage[];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMessage[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function enqueue(content: string, conversationId: string | null = null): string {
  const queue = loadQueue();
  const id = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  queue.push({ id, conversationId, content, timestamp: Date.now(), retryCount: 0 });
  saveQueue(queue);
  return id;
}

function dequeue(id: string): void {
  saveQueue(loadQueue().filter((m) => m.id !== id));
}

function getPending(): QueuedMessage[] {
  return loadQueue().filter((m) => m.retryCount < MAX_RETRIES);
}

function markRetry(id: string): void {
  const updated = loadQueue().map((m) =>
    m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m,
  );
  saveQueue(updated.filter((m) => m.retryCount < MAX_RETRIES));
}

function hasPending(): boolean {
  return getPending().length > 0;
}

function clearAll(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export const syncQueue = { enqueue, dequeue, getPending, markRetry, hasPending, clearAll };
