import { useEffect, useRef } from 'react';
import { fetchIntegrationEvents } from '../services/interoperabilityApi';
import { ingestIntegrationPreArrivalEvent } from '../services/integrationPreArrivalConsumer';
import { applyRoomStatusFromIntegrationEvent } from '../services/roomStatusSync';

export function useIntegrationPreArrivalSync(enabled = true, pollMs = 60_000): void {
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return undefined;

    const sync = async () => {
      try {
        const payload = await fetchIntegrationEvents(30);
        const events = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
        events.forEach((event: Record<string, unknown>) => {
          const id = String(event.id || event.eventId || '');
          if (id && seenIds.current.has(id)) return;
          ingestIntegrationPreArrivalEvent(event);
          applyRoomStatusFromIntegrationEvent(event);
          if (id) seenIds.current.add(id);
        });
      } catch {
        // Integration feed optional — reception continues with manual/EMS paths.
      }
    };

    void sync();
    const timer = window.setInterval(() => void sync(), pollMs);
    return () => window.clearInterval(timer);
  }, [enabled, pollMs]);
}