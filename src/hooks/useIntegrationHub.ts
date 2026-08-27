import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import { fetchIntegrationHub } from '../services/emergencyOsApi';
import {
  fetchIntegrationEvents,
  fetchInteroperabilitySummary,
} from '../services/interoperabilityApi';

export type IntegrationHubEnvelope = {
  module?: string;
  source?: string;
  data?: {
    sources?: Array<Record<string, unknown>>;
    reviewQueue?: Array<Record<string, unknown>>;
  };
  remainingGaps?: string[];
};

export type IntegrationHubState = {
  status: 'loading' | 'ready' | 'partial' | 'error';
  error: string;
  envelope: IntegrationHubEnvelope | null;
  interoperabilitySummary: Record<string, unknown> | null;
  recentEvents: Array<Record<string, unknown>>;
  refresh: () => Promise<void>;
};

export function useIntegrationHub(eventLimit = 25): IntegrationHubState {
  const [status, setStatus] = useState<IntegrationHubState['status']>('loading');
  const [error, setError] = useState('');
  const [envelope, setEnvelope] = useState<IntegrationHubEnvelope | null>(null);
  const [interoperabilitySummary, setInteroperabilitySummary] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<Record<string, unknown>>>([]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError('');

    const [hubResult, summaryResult, eventsResult] = await Promise.allSettled([
      fetchIntegrationHub(),
      fetchInteroperabilitySummary(),
      fetchIntegrationEvents(eventLimit),
    ]);

    if (hubResult.status === 'fulfilled') {
      const nextEnvelope = hubResult.value as IntegrationHubEnvelope;
      setEnvelope(nextEnvelope);
      setStatus(nextEnvelope?.remainingGaps?.length ? 'partial' : 'ready');
    } else {
      setEnvelope(null);
      setStatus('error');
      setError(
        getApiErrorMessage(hubResult.reason) ||
          'Integration Hub status is temporarily unavailable.',
      );
    }

    if (summaryResult.status === 'fulfilled') {
      setInteroperabilitySummary(summaryResult.value as Record<string, unknown>);
    } else {
      setInteroperabilitySummary(null);
    }

    if (eventsResult.status === 'fulfilled') {
      const payload = eventsResult.value;
      setRecentEvents(Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []);
    } else {
      setRecentEvents([]);
    }
  }, [eventLimit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    error,
    envelope,
    interoperabilitySummary,
    recentEvents,
    refresh,
  };
}
