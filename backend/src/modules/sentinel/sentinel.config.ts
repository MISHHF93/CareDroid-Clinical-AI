/**
 * Sentinel feature flags and operational defaults.
 * SENTINEL_ENABLED defaults false so EDOS is unchanged until explicitly activated.
 */

export type SentinelRuntimeConfig = Readonly<{
  enabled: boolean;
  postgis: boolean;
  fleetBridge: boolean;
  mockAdapter: boolean;
  escalationDeadlineMs: number;
  stalePositionMs: number;
  hospitalLatitude: number;
  hospitalLongitude: number;
  defaultTraffic: 'low' | 'moderate' | 'heavy' | 'unknown';
}>;

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultValue;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

function envNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

export function getSentinelRuntimeConfig(): SentinelRuntimeConfig {
  const traffic = String(process.env.SENTINEL_DEFAULT_TRAFFIC || 'unknown').toLowerCase();
  const allowed = new Set(['low', 'moderate', 'heavy', 'unknown']);
  return Object.freeze({
    enabled: envFlag('SENTINEL_ENABLED', false),
    postgis: envFlag('SENTINEL_POSTGIS', false),
    fleetBridge: envFlag('SENTINEL_FLEET_BRIDGE', false),
    mockAdapter: envFlag('SENTINEL_MOCK_ADAPTER', true),
    escalationDeadlineMs: envNumber('SENTINEL_ESCALATION_MS', 3 * 60 * 1000),
    stalePositionMs: envNumber('SENTINEL_STALE_POSITION_MS', 5 * 60 * 1000),
    hospitalLatitude: envNumber('SENTINEL_HOSPITAL_LAT', 40.758),
    hospitalLongitude: envNumber('SENTINEL_HOSPITAL_LNG', -73.9855),
    defaultTraffic: (allowed.has(traffic)
      ? traffic
      : 'unknown') as SentinelRuntimeConfig['defaultTraffic'],
  });
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
