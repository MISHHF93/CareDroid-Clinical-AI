import { buildApiUrl, buildStreamUrl, getStoredAccessToken } from './apiClient';

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_RECONNECT_MS = 10_000;
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

function createPollingLoop({ intervalMs, onPoll, onStatus }) {
  let timerId = null;
  let stopped = false;

  const runPoll = async () => {
    if (stopped) return;
    onStatus?.({
      status: 'reconnecting',
      mode: 'polling',
      message: 'Live updates paused - polling every 30 seconds.',
      updatedAt: new Date().toISOString(),
    });
    await onPoll?.();
    if (!stopped) {
      timerId = window.setTimeout(runPoll, intervalMs);
    }
  };

  timerId = window.setTimeout(runPoll, 250);

  return () => {
    stopped = true;
    if (timerId) window.clearTimeout(timerId);
  };
}

function openEventSource({ path, onEvent, onStatus, scheduleReconnect }) {
  const source = new EventSource(buildAuthenticatedSsePath(path));

  source.onopen = () => {
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

function openWebSocket({ path, onEvent, onStatus, scheduleReconnect }) {
  const socket = new WebSocket(path);

  socket.onopen = () => {
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

export function startEmergencyRealtime({ onEvent, onStatus, onPoll } = {}) {
  if (typeof window === 'undefined') return () => {};

  const config = realtimeConfig();
  const disposers = new Set();
  let stopped = false;
  let reconnectTimer = null;

  const stopCurrentConnections = () => {
    disposers.forEach((dispose) => dispose());
    disposers.clear();
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, DEFAULT_RECONNECT_MS);
  };

  const connect = () => {
    if (stopped) return;
    stopCurrentConnections();

    if (config.ssePath && typeof EventSource !== 'undefined') {
      disposers.add(openEventSource({ path: config.ssePath, onEvent, onStatus, scheduleReconnect }));
      return;
    }

    if (config.wsPath && typeof WebSocket !== 'undefined') {
      disposers.add(openWebSocket({ path: config.wsPath, onEvent, onStatus, scheduleReconnect }));
      return;
    }

    onStatus?.({
      status: 'reconnecting',
      mode: 'polling',
      message: 'Emergency OS realtime unavailable; polling every 30 seconds.',
      updatedAt: new Date().toISOString(),
    });
  };

  connect();
  disposers.add(
    createPollingLoop({
      intervalMs: config.pollIntervalMs,
      onPoll,
      onStatus,
    })
  );

  return () => {
    stopped = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    stopCurrentConnections();
  };
}

export default startEmergencyRealtime;
