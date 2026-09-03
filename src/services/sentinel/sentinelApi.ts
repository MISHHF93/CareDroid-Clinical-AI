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

export type SentinelApiResult<T> =
  | Readonly<{
      ok: true;
      data: T;
      message: string;
      sentinelEnabled: boolean;
      generatedAt: string;
    }>
  | Readonly<{
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

/**
 * Guards against a truthy-but-wrong-shaped response reaching `HospitalCommandCenter` —
 * the dev-only offline shim (`apiClient.ts`'s `buildDevOfflineJsonBody`) has no
 * Sentinel-specific case, so an unreachable backend in dev mode returns its generic
 * `{data:null, items:[], ...}` placeholder with a 200 status. `sentinelFetch` sees
 * `ok:true` and passes it straight through, and every consumer (`buildSentinelCommandMetrics`,
 * `buildSentinelLiveRegionText`, this page's own direct `.units.length` reads) assumed a
 * truthy snapshot was a well-shaped one and crashed on `.filter`/`.length` of a missing field.
 */
function isPlausibleSentinelSnapshot(data: unknown): data is SentinelCommandSnapshot {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.units) ||
    Array.isArray(d.openAlarms) ||
    Array.isArray(d.aiRecommendations) ||
    Array.isArray(d.inboundPatients)
  );
}

function normalizeSentinelCommandSnapshot(data: SentinelCommandSnapshot): SentinelCommandSnapshot {
  return {
    units: Array.isArray(data.units) ? data.units : [],
    geofences: Array.isArray(data.geofences) ? data.geofences : [],
    episodes: Array.isArray(data.episodes) ? data.episodes : [],
    inboundPatients: Array.isArray(data.inboundPatients) ? data.inboundPatients : [],
    openAlarms: Array.isArray(data.openAlarms) ? data.openAlarms : [],
    aiRecommendations: Array.isArray(data.aiRecommendations) ? data.aiRecommendations : [],
  };
}

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
    if (!isPlausibleSentinelSnapshot(parsed?.snapshot)) return null;
    return { savedAt: parsed.savedAt, snapshot: normalizeSentinelCommandSnapshot(parsed.snapshot) };
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
  if (live.ok && isPlausibleSentinelSnapshot(live.data)) {
    const normalized = normalizeSentinelCommandSnapshot(live.data);
    cacheSentinelCommandSnapshot(normalized);
    return {
      snapshot: normalized,
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

  if (!live.ok && live.unsupported) {
    throw new SentinelCapabilityUnavailableError(live.message);
  }

  return {
    snapshot: null,
    source: 'unavailable',
    message: live.message,
    stale: true,
  };
}
