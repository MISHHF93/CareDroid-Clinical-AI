import { buildStreamUrl, getStoredAccessToken } from './apiClient';
import { probeBackendReachability } from './backendReachability';

const DEFAULT_SSE_PATH = '/api/collaboration/realtime/stream';
const DEFAULT_POLL_INTERVAL_MS = 20_000;
const MIN_RECONNECT_MS = 8_000;
const MAX_RECONNECT_MS = 60_000;

export type CollaborationRealtimeEvent = {
  type: string;
  payload?: any;
  receivedAt: string;
};

type RealtimeStatus = {
  status: 'connected' | 'reconnecting';
  mode: 'sse' | 'polling';
  message: string;
  updatedAt: string;
};

function buildAuthenticatedSsePath(path: string) {
  const token = getStoredAccessToken();
  if (!token) return buildStreamUrl(path);
  const separator = path.includes('?') ? '&' : '?';
  return buildStreamUrl(`${path}${separator}token=${encodeURIComponent(token)}`);
}

function normalizeEvent(raw: any): CollaborationRealtimeEvent | null {
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') return null;
  const type = parsed.type || parsed.event;
  if (!type) return null;
  return { type, payload: parsed.payload, receivedAt: new Date().toISOString() };
}

function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createPollingLoop({ intervalMs, onPoll, onStatus }: any) {
  let timerId: any = null;
  let stopped = false;

  const runPoll = async () => {
    if (stopped) return;
    onStatus?.({
      status: 'reconnecting',
      mode: 'polling',
      message: 'Live updates paused — polling.',
      updatedAt: new Date().toISOString(),
    });
    try {
      await onPoll?.();
    } catch {
      // Swallow — the next tick retries.
    }
    if (!stopped) timerId = window.setTimeout(runPoll, intervalMs);
  };

  timerId = window.setTimeout(runPoll, 250);
  return () => {
    stopped = true;
    if (timerId) window.clearTimeout(timerId);
  };
}

/**
 * WS→SSE→polling fallback for the Collaboration Hub, mirroring
 * src/services/emergencyRealtimeService.ts's proven shape but scoped to what
 * this feature needs (SSE + polling only — see the architecture decision to
 * skip a new WebSocket gateway in favor of the existing authenticated SSE
 * pattern). Never interrupts the rest of the app if the backend is offline —
 * it just degrades to periodic polling via onPoll.
 */
export function startCollaborationRealtime({ onEvent, onStatus, onPoll }: any = {}) {
  if (typeof window === 'undefined') return () => {};

  let stopped = false;
  let reconnectTimer: any = null;
  let reconnectAttempt = 0;
  let disposeCurrent: (() => void) | null = null;
  let pollDispose: (() => void) | null = null;

  const emitStatus = (status: RealtimeStatus) => onStatus?.(status);

  // Polling is a true fallback, not a parallel background job: it only runs
  // while SSE is down, and stops the instant SSE reconnects. Running both at
  // once was hitting the (comparatively expensive) channel-list endpoint
  // every 20s even when SSE was healthy and nothing had changed.
  const stopPolling = () => {
    pollDispose?.();
    pollDispose = null;
  };

  const startPollingIfNeeded = () => {
    if (pollDispose || stopped) return;
    pollDispose = createPollingLoop({
      intervalMs: DEFAULT_POLL_INTERVAL_MS,
      onPoll,
      onStatus: emitStatus,
    });
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectAttempt += 1;
    const delay = Math.min(MIN_RECONNECT_MS * 2 ** reconnectAttempt, MAX_RECONNECT_MS);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  };

  const connect = async () => {
    if (stopped) return;
    disposeCurrent?.();
    disposeCurrent = null;

    const reachable = await probeBackendReachability();
    if (!reachable || typeof EventSource === 'undefined') {
      emitStatus({
        status: 'reconnecting',
        mode: 'polling',
        message: reachable ? 'SSE unavailable — polling.' : 'API offline — polling for updates.',
        updatedAt: new Date().toISOString(),
      });
      startPollingIfNeeded();
      scheduleReconnect();
      return;
    }

    const source = new EventSource(buildAuthenticatedSsePath(DEFAULT_SSE_PATH));
    source.onopen = () => {
      reconnectAttempt = 0;
      stopPolling();
      emitStatus({
        status: 'connected',
        mode: 'sse',
        message: 'Collaboration Hub connected.',
        updatedAt: new Date().toISOString(),
      });
    };
    source.onmessage = (message) => {
      const event = normalizeEvent(message.data);
      if (!event || event.type === 'heartbeat' || event.type === 'connected') return;
      onEvent?.(event);
    };
    source.onerror = () => {
      source.close();
      emitStatus({
        status: 'reconnecting',
        mode: 'sse',
        message: 'Reconnecting…',
        updatedAt: new Date().toISOString(),
      });
      startPollingIfNeeded();
      scheduleReconnect();
    };
    disposeCurrent = () => source.close();
  };

  void connect();

  return () => {
    stopped = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    disposeCurrent?.();
    stopPolling();
  };
}

export default startCollaborationRealtime;
