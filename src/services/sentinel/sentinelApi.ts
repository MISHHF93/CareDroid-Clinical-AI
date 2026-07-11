/**
 * CareDroid Sentinel API client — typed access to /api/sentinel/*
 */

import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import { apiFetchJson, getApiErrorMessage } from '../apiClient';
import {
  SentinelCapabilityUnavailableError,
  type SentinelAnalyticsSnapshot,
  type SentinelCommandSnapshot,
} from '../../types/sentinel';

const BASE = '/api/sentinel';

export type SentinelApiResult<T> = Readonly<{
  ok: true;
  data: T;
  message: string;
  sentinelEnabled: boolean;
  generatedAt: string;
}> | Readonly<{
  ok: false;
  message: string;
  unsupported?: boolean;
  status?: number;
}>;

async function sentinelFetch<T>(
  capability: string,
  path: string,
  options: RequestInit = {},
): Promise<SentinelApiResult<T>> {
  if (!isBackendCapabilityEnabled(capability as 'sentinelCommand')) {
    return {
      ok: false,
      unsupported: true,
      message: 'Sentinel backend capability is disabled in this build.',
    };
  }

  try {
    const { response, data } = await apiFetchJson(`${BASE}${path}`, options);
    if (!response.ok || data?.success === false) {
      return {
        ok: false,
        status: response.status,
        message: data?.message || getApiErrorMessage(null, response),
      };
    }
    return {
      ok: true,
      data: (data?.data ?? data) as T,
      message: data?.message || '',
      sentinelEnabled: Boolean(data?.sentinelEnabled),
      generatedAt: data?.generatedAt || new Date().toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    return {
      ok: false,
      message: getApiErrorMessage(error),
    };
  }
}

export async function fetchSentinelHealth() {
  return sentinelFetch<Record<string, unknown>>('sentinelHealth', '/health');
}

export async function fetchSentinelCommandSnapshot() {
  return sentinelFetch<SentinelCommandSnapshot>('sentinelCommand', '/command-snapshot');
}

export async function fetchSentinelAnalytics() {
  return sentinelFetch<SentinelAnalyticsSnapshot>('sentinelAnalytics', '/analytics');
}

export async function fetchSentinelAlarms() {
  return sentinelFetch<unknown[]>('sentinelAlarms', '/alarms');
}

export async function acknowledgeSentinelAlarm(
  alarmId: string,
  reason?: string,
): Promise<SentinelApiResult<unknown>> {
  return sentinelFetch('sentinelAlarms', `/alarms/${encodeURIComponent(alarmId)}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || null }),
  });
}

export async function reviewSentinelAiRecommendation(
  id: string,
  status: 'accepted' | 'rejected' | 'modified',
): Promise<SentinelApiResult<unknown>> {
  return sentinelFetch('sentinelAi', `/ai/recommendations/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function ingestSentinelCad(
  payload: Record<string, unknown>,
): Promise<SentinelApiResult<unknown>> {
  return sentinelFetch('sentinelIngest', '/ingest/cad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function forceSentinelPoll(): Promise<SentinelApiResult<unknown>> {
  return sentinelFetch('sentinelCommand', '/poll', { method: 'POST' });
}

export async function upsertSentinelInbound(
  payload: Record<string, unknown>,
): Promise<SentinelApiResult<unknown>> {
  return sentinelFetch('sentinelInbound', '/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Offline-safe command snapshot fallback using last known local cache.
 */
const SNAPSHOT_CACHE_KEY = 'caredroid.sentinel.commandSnapshot.v1';

export function cacheSentinelCommandSnapshot(snapshot: SentinelCommandSnapshot): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      SNAPSHOT_CACHE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), snapshot }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readCachedSentinelCommandSnapshot(): {
  savedAt: string;
  snapshot: SentinelCommandSnapshot;
} | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: string; snapshot: SentinelCommandSnapshot };
    if (!parsed?.snapshot) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadSentinelCommandSnapshotWithFallback(): Promise<{
  snapshot: SentinelCommandSnapshot | null;
  source: 'live' | 'cache' | 'unavailable';
  message: string;
  stale: boolean;
}> {
  const live = await fetchSentinelCommandSnapshot();
  if (live.ok) {
    cacheSentinelCommandSnapshot(live.data);
    return {
      snapshot: live.data,
      source: 'live',
      message: live.message,
      stale: false,
    };
  }

  const cached = readCachedSentinelCommandSnapshot();
  if (cached) {
    return {
      snapshot: cached.snapshot,
      source: 'cache',
      message: `Using cached Sentinel snapshot from ${cached.savedAt}. ${live.message}`,
      stale: true,
    };
  }

  if (live.unsupported) {
    throw new SentinelCapabilityUnavailableError(live.message);
  }

  return {
    snapshot: null,
    source: 'unavailable',
    message: live.message,
    stale: true,
  };
}
