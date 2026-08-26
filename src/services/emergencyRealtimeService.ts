import { buildStreamUrl, getStoredAccessToken } from './apiClient';
import { probeBackendReachability } from './backendReachability';
import observabilityService from './observabilityService';
import { startWorkflowTrace } from './observabilityTrace';
import { ensureDevBackendSession } from './devBackendAuth';

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const MIN_RECONNECT_MS = 10_000;
const MAX_RECONNECT_MS = 120_000;
const SSE_SUSPEND_AFTER_FAILURES = 4;
const DEFAULT_SSE_PATH = '/api/emergency/realtime/stream';

function envValue(name) {
  return import.meta.env?.[name] || '';
}

function realtimeConfig() {
  return {
    ssePath: envValue('VITE_ED_REALTIME_SSE_PATH') || DEFAULT_SSE_PATH,
    wsPath: envValue('VITE_ED_REALTIME_WS_PATH'),
    pollIntervalMs: Number(envValue('VITE_ED_REALTIME_POLL_MS')) || DEFAULT_POLL_INTERVAL_MS,
  };
}

function buildAuthenticatedSsePath(path) {
  const token = getStoredAccessToken();
  const basePath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
  if (!token) return buildStreamUrl(basePath);
  const separator = basePath.includes('?') ? '&' : '?';
  return buildStreamUrl(`${basePath}${separator}token=${encodeURIComponent(token)}`);
}

async function isBackendReachable() {
  return probeBackendReachability();
}

function parseRealtimeMessage(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeRealtimeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const type = event.type || event.event || event.name || event.topic;
  if (!type) return null;
  return {
    type,
    payload: event.payload || event.data || event.record || event,
    receivedAt: new Date().toISOString(),
  };
}

function createPollingLoop({ intervalMs, onPoll, onStatus, shouldPoll }: any) {
  let timerId: any = null;
  let stopped = false;
  let failureCount = 0;

  const nextInterval = () =>
    Math.min(intervalMs * 2 ** Math.min(failureCount, 3), intervalMs * 8);

  const runPoll = async () => {
    if (stopped) return;
    if (shouldPoll && !shouldPoll()) {
      // Live SSE/WebSocket connection is healthy — this tick is a true no-op
      // (no status spam, no network calls) rather than redundant polling.
      timerId = window.setTimeout(runPoll, intervalMs);
      return;
    }
    onStatus?.({
      status: 'reconnecting',
      mode: 'polling',
      message: 'Live updates paused - polling every 30 seconds.',
      updatedAt: new Date().toISOString(),
    });
    try {
      await onPoll?.();
      failureCount = 0;
    } catch {
      failureCount += 1;
    }
    if (!stopped) {
      timerId = window.setTimeout(runPoll, nextInterval());
    }
  };

  timerId = window.setTimeout(runPoll, 250);

  return () => {
    stopped = true;
    if (timerId) window.clearTimeout(timerId);
  };
}

function openEventSource({ path, onEvent, onStatus, scheduleReconnect, onConnected }) {
  const source = new EventSource(buildAuthenticatedSsePath(path));

  source.onopen = () => {
    onConnected?.();
    onStatus?.({
      status: 'connected',
      mode: 'sse',
      message: 'Real-time connected.',
      updatedAt: new Date().toISOString(),
    });
  };

  source.onmessage = (message) => {
    const event = normalizeRealtimeEvent(parseRealtimeMessage(message.data));
    if (!event) return;
    if (event.type === 'heartbeat') return;
    if (event.type === 'connected') {
      onConnected?.();
      onStatus?.({
        status: 'connected',
        mode: event.payload?.mode || 'sse',
        message: 'Real-time connected.',
        updatedAt: new Date().toISOString(),
      });
    }
    onEvent?.(event);
  };

  source.onerror = () => {
    source.close();
    onStatus?.({
      status: 'reconnecting',
      mode: 'sse',
      message: 'Reconnecting...',
      updatedAt: new Date().toISOString(),
    });
    scheduleReconnect?.();
  };

  return () => source.close();
}

function openWebSocket({ path, onEvent, onStatus, scheduleReconnect, onConnected }) {
  const socket = new WebSocket(path);

  socket.onopen = () => {
    onConnected?.();
    onStatus?.({
      status: 'connected',
      mode: 'websocket',
      message: 'Real-time connected.',
      updatedAt: new Date().toISOString(),
    });
  };

  socket.onmessage = (message) => {
    const event = normalizeRealtimeEvent(parseRealtimeMessage(message.data));
    if (event) onEvent?.(event);
  };

  socket.onerror = () => {
    onStatus?.({
      status: 'reconnecting',
      mode: 'websocket',
      message: 'Reconnecting...',
      updatedAt: new Date().toISOString(),
    });
  };

  socket.onclose = () => scheduleReconnect?.();

  return () => socket.close();
}

function mapRealtimeStatusToHealth(
  status?: string,
): 'ok' | 'degraded' | 'offline' | 'reconnecting' {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'connected') return 'ok';
  if (normalized === 'reconnecting') return 'reconnecting';
  if (normalized.includes('offline')) return 'offline';
  return 'degraded';
}

type RealtimeListener = { onEvent?: (event: any) => void; onStatus?: (status: any) => void; onPoll?: () => any };

// Several independent hooks (AppShell, useCareDroidCentralNode, etc.) each called this
// with their own onEvent/onPoll — every one opened its own EventSource to the same
// /api/emergency/realtime/stream endpoint, so every server-pushed event (and every
// polling fallback tick) fired once per caller instead of once per app. This turns
// startEmergencyRealtime into a ref-counted multiplexer: the first caller opens the one
// real connection/poll loop; later callers just register listeners on it; the connection
// tears down only once the last caller disposes.
let sharedRealtimeSession: {
  listeners: Set<RealtimeListener>;
  teardown: () => void;
} | null = null;

export function startEmergencyRealtime(listener: RealtimeListener = {}) {
  if (typeof window === 'undefined') return () => {};

  if (!sharedRealtimeSession) {
    const listeners = new Set<RealtimeListener>();
    const fanOutEvent = (event: any) => listeners.forEach((l) => l.onEvent?.(event));
    const fanOutStatus = (status: any) => listeners.forEach((l) => l.onStatus?.(status));
    const fanOutPoll = async () => {
      await Promise.all(Array.from(listeners).map((l) => l.onPoll?.()));
    };
    sharedRealtimeSession = {
      listeners,
      teardown: startEmergencyRealtimeSession({ onEvent: fanOutEvent, onStatus: fanOutStatus, onPoll: fanOutPoll }),
    };
  }

  sharedRealtimeSession.listeners.add(listener);

  return () => {
    if (!sharedRealtimeSession) return;
    sharedRealtimeSession.listeners.delete(listener);
    if (sharedRealtimeSession.listeners.size === 0) {
      sharedRealtimeSession.teardown();
      sharedRealtimeSession = null;
    }
  };
}

function startEmergencyRealtimeSession({ onEvent, onStatus, onPoll }: any = {}) {
  const config = realtimeConfig();
  const disposers = new Set();
  let stopped = false;
  let reconnectTimer: any = null;
  let reconnectAttempt = 0;
  let sseSuspended = false;
  const sessionTrace = startWorkflowTrace('emergency-realtime-session', {
    source: 'emergencyRealtimeService',
    summary: 'Emergency realtime session',
    metadata: { ssePath: config.ssePath, wsPath: config.wsPath || null },
  });
  let lastHealthStatus: string | null = null;

  const emitRealtimeHealth = (statusPayload: Record<string, unknown> = {}) => {
    const status = String(statusPayload.status || 'unknown');
    if (status === lastHealthStatus) return;
    lastHealthStatus = status;
    observabilityService.recordHealthSignal({
      name: 'emergency_realtime_status',
      status: mapRealtimeStatusToHealth(status),
      source: 'emergencyRealtimeService',
      message: String(statusPayload.message || status),
      metadata: {
        mode: statusPayload.mode,
        workflow: 'emergency-realtime-session',
      },
    });
  };

  const wrappedOnStatus = (statusPayload: Record<string, unknown>) => {
    emitRealtimeHealth(statusPayload);
    onStatus?.(statusPayload);
  };

  const stopCurrentConnections = () => {
    disposers.forEach((dispose: any) => dispose());
    disposers.clear();
  };

  // Tracks whether a live SSE/WebSocket connection is currently open. The
  // 30s polling loop below always runs (see createPollingLoop wiring at the
  // bottom of this function) but was doing full network work on every tick
  // even while the live connection was healthy — this flag turns it back
  // into a true fallback: the timer still ticks, but onPoll is a no-op
  // whenever a live connection is up, so refreshAllData() + the central-node
  // snapshot fetch only run when SSE/WS actually isn't delivering updates.
  let liveConnected = false;

  const resetReconnectState = () => {
    reconnectAttempt = 0;
    sseSuspended = false;
    liveConnected = true;
  };

  const reconnectDelayMs = () =>
    Math.min(MIN_RECONNECT_MS * 2 ** reconnectAttempt, MAX_RECONNECT_MS);

  const scheduleReconnect = () => {
    liveConnected = false;
    if (stopped || reconnectTimer) return;
    reconnectAttempt += 1;
    if (reconnectAttempt >= SSE_SUSPEND_AFTER_FAILURES) {
      sseSuspended = true;
    }
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelayMs());
  };

  const connect = async () => {
    if (stopped) return;
    stopCurrentConnections();

    // EventSource/WebSocket URLs bake the access token into the query string
    // at connect time and are never re-authenticated afterward, unlike a
    // regular fetch/axios call — so a stale-but-cached token here doesn't
    // surface as a retryable 401, it just silently drops every real-time
    // event until the NEXT reconnect attempt happens to run after some other
    // API call has refreshed the cached token. Refreshing proactively on
    // every (re)connect — cheap no-op when the cached token is still fresh —
    // closes that gap directly instead of relying on that coincidence.
    await ensureDevBackendSession();

    const reachable = await isBackendReachable();
    if (!reachable) {
      wrappedOnStatus({
        status: 'reconnecting',
        mode: 'polling',
        message: 'API offline — using local CareDroid state until backend is available.',
        updatedAt: new Date().toISOString(),
      });
      scheduleReconnect();
      return;
    }

    if (sseSuspended) {
      resetReconnectState();
    }

    if (config.ssePath && typeof EventSource !== 'undefined') {
      disposers.add(
        openEventSource({
          path: config.ssePath,
          onEvent,
          onStatus: wrappedOnStatus,
          scheduleReconnect,
          onConnected: resetReconnectState,
        }),
      );
      return;
    }

    if (config.wsPath && typeof WebSocket !== 'undefined') {
      disposers.add(
        openWebSocket({
          path: config.wsPath,
          onEvent,
          onStatus: wrappedOnStatus,
          scheduleReconnect,
          onConnected: resetReconnectState,
        }),
      );
      return;
    }

    wrappedOnStatus({
      status: 'reconnecting',
      mode: 'polling',
      message: 'CareDroid realtime unavailable; polling every 30 seconds.',
      updatedAt: new Date().toISOString(),
    });
  };

  void connect();
  disposers.add(
    createPollingLoop({
      intervalMs: config.pollIntervalMs,
      onPoll,
      onStatus: wrappedOnStatus,
      shouldPoll: () => !liveConnected,
    }),
  );

  return () => {
    stopped = true;
    sessionTrace.end('cancelled', { reason: 'dispose' });
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    stopCurrentConnections();
  };
}

export default startEmergencyRealtime;
