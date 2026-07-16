/**
 * Typed interactive realtime client — sequence numbers, freshness, dedupe,
 * stale rejection, and polling fallback. Wraps emergency SSE/WS infrastructure
 * without opening duplicate connections.
 */

import { startEmergencyRealtime } from '../emergencyRealtimeService';
import type {
  RealtimeConnectionStatus,
  TypedRealtimeEvent,
  InteractiveRealtimeTopic,
} from '../../contracts/interactiveAi';

const STALE_MS_DEFAULT = 120_000;

type Handler = (event: TypedRealtimeEvent) => void;
type StatusHandler = (status: RealtimeConnectionStatus) => void;

let sequenceCounter = 0;
const seenEventIds = new Map<string, number>();
const SEEN_TTL_MS = 10 * 60 * 1000;

function pruneSeen(): void {
  const cutoff = Date.now() - SEEN_TTL_MS;
  for (const [id, ts] of seenEventIds) {
    if (ts < cutoff) seenEventIds.delete(id);
  }
}

function toTypedEvent(raw: {
  type?: string;
  payload?: unknown;
  receivedAt?: string;
}): TypedRealtimeEvent | null {
  if (!raw?.type) return null;
  const payload =
    raw.payload && typeof raw.payload === 'object'
      ? (raw.payload as Record<string, unknown>)
      : { value: raw.payload };

  const eventId =
    String(payload.eventId || payload.id || `${raw.type}-${raw.receivedAt || Date.now()}`);
  const sequence =
    typeof payload.sequence === 'number' ? payload.sequence : ++sequenceCounter;
  const occurredAt = String(
    payload.occurredAt || payload.timestamp || raw.receivedAt || new Date().toISOString(),
  );

  return {
    eventId,
    topic: raw.type as InteractiveRealtimeTopic | string,
    sequence,
    occurredAt,
    freshnessMs:
      typeof payload.freshnessMs === 'number' ? payload.freshnessMs : undefined,
    tenantId: payload.tenantId ? String(payload.tenantId) : undefined,
    organizationId: payload.organizationId ? String(payload.organizationId) : undefined,
    payload: raw.payload,
  };
}

function isStale(event: TypedRealtimeEvent, maxAgeMs: number): boolean {
  const age = Date.now() - Date.parse(event.occurredAt);
  if (Number.isNaN(age)) return false;
  if (typeof event.freshnessMs === 'number') {
    return event.freshnessMs > maxAgeMs || age > maxAgeMs;
  }
  return age > maxAgeMs;
}

export type InteractiveRealtimeClientOptions = {
  staleAfterMs?: number;
  organizationId?: string;
  onEvent?: Handler;
  onStatus?: StatusHandler;
  topics?: Array<InteractiveRealtimeTopic | string>;
};

/**
 * Subscribe to typed interactive events with dedupe + stale rejection.
 * Falls back through the shared emergency realtime multiplexer (SSE → poll).
 */
export function startInteractiveRealtimeClient(
  options: InteractiveRealtimeClientOptions = {},
): () => void {
  const staleAfterMs = options.staleAfterMs ?? STALE_MS_DEFAULT;
  let lastEventAt: string | undefined;
  let lastStatus: RealtimeConnectionStatus = {
    status: 'offline',
    mode: 'none',
    message: 'Not connected',
    updatedAt: new Date().toISOString(),
    isStale: true,
  };

  const emitStatus = (partial: Partial<RealtimeConnectionStatus>) => {
    lastStatus = {
      ...lastStatus,
      ...partial,
      updatedAt: new Date().toISOString(),
      lastEventAt,
      isStale:
        !lastEventAt ||
        Date.now() - Date.parse(lastEventAt) > staleAfterMs ||
        partial.status === 'offline',
    };
    options.onStatus?.(lastStatus);
  };

  const dispose = startEmergencyRealtime({
    onEvent: (raw: { type?: string; payload?: unknown; receivedAt?: string }) => {
      const typed = toTypedEvent(raw);
      if (!typed) return;

      if (options.topics?.length && !options.topics.includes(typed.topic)) {
        return;
      }
      if (
        options.organizationId &&
        typed.organizationId &&
        typed.organizationId !== options.organizationId
      ) {
        return;
      }

      pruneSeen();
      if (seenEventIds.has(typed.eventId)) {
        return;
      }
      seenEventIds.set(typed.eventId, Date.now());

      if (isStale(typed, staleAfterMs)) {
        emitStatus({
          status: 'degraded',
          mode: lastStatus.mode,
          message: 'Stale event rejected — not shown as live.',
        });
        return;
      }

      lastEventAt = typed.occurredAt;
      options.onEvent?.(typed);
      emitStatus({
        status: 'connected',
        mode: lastStatus.mode === 'none' ? 'sse' : lastStatus.mode,
        message: 'Live updates active.',
      });
    },
    onStatus: (status: {
      status?: string;
      mode?: string;
      message?: string;
      updatedAt?: string;
    }) => {
      const mapped =
        status.status === 'connected'
          ? 'connected'
          : status.status === 'reconnecting'
            ? 'reconnecting'
            : status.mode === 'polling'
              ? 'polling'
              : 'degraded';
      emitStatus({
        status: mapped as RealtimeConnectionStatus['status'],
        mode: (status.mode as RealtimeConnectionStatus['mode']) || lastStatus.mode,
        message: status.message || lastStatus.message,
      });
    },
  });

  emitStatus({
    status: 'reconnecting',
    mode: 'sse',
    message: 'Connecting interactive realtime…',
  });

  return () => {
    dispose?.();
    emitStatus({
      status: 'offline',
      mode: 'none',
      message: 'Interactive realtime stopped.',
    });
  };
}

export function __resetInteractiveRealtimeSeenForTests(): void {
  seenEventIds.clear();
  sequenceCounter = 0;
}
