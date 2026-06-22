import { useEffect } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';

export type UseEmergencyWebSocketOptions = {
  url?: string;
  protocols?: string | string[];
  enabled?: boolean;
  reconnectMs?: number;
};

export function useEmergencyWebSocket(options: UseEmergencyWebSocketOptions = {}) {
  const enabled = options.enabled ?? true;
  const loading = useEmergencyStore((state) => state.loading);
  const dispatchWebSocketEvent = useEmergencyStore((state) => state.dispatchWebSocketEvent);

  useEffect(() => {
    if (!enabled || typeof WebSocket === 'undefined') return undefined;
    const url = options.url || '/api/emergency/realtime';
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(url, options.protocols);
      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);
          dispatchWebSocketEvent(payload);
        } catch {
          // Ignore malformed realtime events; polling/store state remains authoritative.
        }
      });
    } catch {
      return undefined;
    }

    return () => socket?.close();
  }, [dispatchWebSocketEvent, enabled, options.protocols, options.url]);

  return { connected: enabled && !loading };
}
