/**
 * Normalized auto-refresh for wall / kiosk display modes.
 */
import {
  CARE_DROID_SCREEN_MODES,
  normalizeCareDroidScreenMode,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import type { EmergencyDashboardRefreshResult } from '../store/emergencyStore';

export const DISPLAY_AUTO_REFRESH_MIN_MS = 15000;
export const DISPLAY_AUTO_REFRESH_DEFAULT_MS = 30000;

export const DISPLAY_AUTO_REFRESH_SCREEN_MODES: ReadonlySet<CareDroidScreenMode> = new Set([
  CARE_DROID_SCREEN_MODES.publicWaiting,
  CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
  CARE_DROID_SCREEN_MODES.commandCenter,
]);

export type DisplayRefreshStatusTone = 'ok' | 'refreshing' | 'stale' | 'error';

export type DisplayRefreshStatus = {
  enabled: boolean;
  refreshIntervalMs: number;
  lastUpdatedAt: string | null;
  lastAttemptAt: string | null;
  isRefreshing: boolean;
  errorMessage: string | null;
  tone: DisplayRefreshStatusTone;
  showStaleBanner: boolean;
  hasCachedContent: boolean;
};

export type DisplayRefreshSettingsInput = {
  wallDisplayRefreshInterval?: number | null;
  screenModeRefreshIntervals?: Partial<Record<string, number | null>>;
};

export function isDisplayAutoRefreshScreenMode(
  screenMode: string | CareDroidScreenMode | null | undefined,
): boolean {
  const normalized = normalizeCareDroidScreenMode(screenMode);
  return Boolean(normalized && DISPLAY_AUTO_REFRESH_SCREEN_MODES.has(normalized));
}

export function resolveDisplayRefreshIntervalMs(
  screenMode: string | CareDroidScreenMode | null | undefined,
  settings: DisplayRefreshSettingsInput = {},
): number {
  const normalized = normalizeCareDroidScreenMode(screenMode);
  const perMode =
    normalized && settings.screenModeRefreshIntervals
      ? settings.screenModeRefreshIntervals[normalized]
      : null;
  const candidate = Number(perMode ?? settings.wallDisplayRefreshInterval) || DISPLAY_AUTO_REFRESH_DEFAULT_MS;
  return Math.max(DISPLAY_AUTO_REFRESH_MIN_MS, candidate);
}

export function summarizeDisplayRefreshErrors(
  result?: EmergencyDashboardRefreshResult | null,
  caughtError?: unknown,
): string | null {
  if (caughtError) {
    return caughtError instanceof Error ? caughtError.message : 'Unable to refresh display data.';
  }
  if (!result?.errors) return null;
  const messages = Object.entries(result.errors)
    .map(([key, message]) => (message ? `${key}: ${message}` : null))
    .filter((entry): entry is string => Boolean(entry));
  return messages.length ? messages.join(' · ') : null;
}

export function formatDisplayUpdatedAt(
  timestamp: string | null | undefined,
  now = new Date(),
): string {
  if (!timestamp) return '—';
  try {
    const parsed = new Date(timestamp);
    if (!Number.isFinite(parsed.getTime())) return '—';
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function formatDisplayRefreshAgeMinutes(
  timestamp: string | null | undefined,
  now = new Date(),
): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function buildDisplayRefreshStatus(input: {
  enabled?: boolean;
  refreshIntervalMs: number;
  lastUpdatedAt?: string | null;
  lastAttemptAt?: string | null;
  isRefreshing?: boolean;
  errorMessage?: string | null;
  hasCachedContent?: boolean;
  staleAfterMs?: number;
  now?: Date;
}): DisplayRefreshStatus {
  const now = input.now || new Date();
  const lastUpdatedAt = input.lastUpdatedAt ?? null;
  const lastAttemptAt = input.lastAttemptAt ?? null;
  const errorMessage = input.errorMessage ?? null;
  const isRefreshing = Boolean(input.isRefreshing);
  const hasCachedContent = Boolean(input.hasCachedContent);
  const staleAfterMs = input.staleAfterMs ?? input.refreshIntervalMs * 2;
  const ageMs = lastUpdatedAt ? now.getTime() - new Date(lastUpdatedAt).getTime() : null;
  const isStale = ageMs !== null && ageMs > staleAfterMs;

  let tone: DisplayRefreshStatusTone = 'ok';
  if (isRefreshing) tone = 'refreshing';
  else if (errorMessage && !hasCachedContent) tone = 'error';
  else if (errorMessage || isStale) tone = 'stale';

  return {
    enabled: Boolean(input.enabled),
    refreshIntervalMs: input.refreshIntervalMs,
    lastUpdatedAt,
    lastAttemptAt,
    isRefreshing,
    errorMessage,
    tone,
    showStaleBanner: Boolean(errorMessage || isStale),
    hasCachedContent,
  };
}

export function buildDepartmentStatusFallbackSnapshot(
  updatedAt: string | null = null,
): {
  metrics: Array<{ id: string; label: string; value: string; tone: string; detail: string }>;
  updatedAt: string | null;
  summaryLine: string;
} {
  return {
    metrics: [
      {
        id: 'system-status',
        label: 'Department status',
        value: 'Updating',
        tone: 'watch',
        detail: 'Showing last known status while data reconnects.',
      },
    ],
    updatedAt,
    summaryLine: 'Live department metrics are temporarily unavailable — staff are restoring the feed.',
  };
}

export function buildCommandCenterFallbackSnapshot(
  updatedAt: string | null = null,
): {
  metrics: Array<{ id: string; label: string; value: string; tone: string; detail: string; trendDirection?: string; trendDelta?: string }>;
  hourlyArrivals: Array<{ hour: string; count: number }>;
  trendIndicators: [];
  updatedAt: string | null;
  summaryLine: string;
  peakHourLabel: string;
} {
  return {
    metrics: [
      {
        id: 'system-health',
        label: 'Throughput feed',
        value: 'Reconnecting',
        tone: 'watch',
        detail: 'Command center metrics will resume when sync recovers.',
      },
    ],
    hourlyArrivals: [],
    trendIndicators: [],
    updatedAt,
    summaryLine: 'Throughput dashboard is using cached data while the operational feed reconnects.',
    peakHourLabel: 'Peak hour unavailable',
  };
}
