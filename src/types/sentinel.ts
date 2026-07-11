/**
 * Frontend Sentinel contracts — re-export shared engines and FE-specific view models.
 */

export {
  SENTINEL_ORCHESTRATOR_VERSION,
  SENTINEL_AI_DISCLAIMER,
  SENTINEL_REQUIRED_PREARRIVAL_FIELDS,
  type SentinelAiRecommendation,
  type SentinelAiEvidence,
  type SentinelEtaResult,
  type SentinelUnitStatus,
  type SentinelFreshness,
  type SentinelAlarmSeverity,
  type SentinelAlarmUrgency,
  type SentinelAlarmStatus,
  type SentinelCoordinates,
  type CadAvlEvent,
} from '../../lib/sentinel';

export type SentinelUnitView = Readonly<{
  id: string;
  externalId: string;
  label: string;
  status: string;
  freshness: string;
  coordinates: { latitude: number; longitude: number } | null;
  heading: number | null;
  speedKmh: number | null;
  lastSeenAt: string | null;
  eta: {
    etaPointMin: number;
    etaLowMin: number;
    etaHighMin: number;
    confidence: number;
    stale: boolean;
    method: string;
  } | null;
}>;

export type SentinelCommandSnapshot = Readonly<{
  units: readonly SentinelUnitView[];
  geofences: readonly {
    id: string;
    name: string;
    kind: string;
    ring: Array<{ latitude: number; longitude: number }>;
  }[];
  episodes: readonly Record<string, unknown>[];
  inboundPatients: readonly Record<string, unknown>[];
  openAlarms: readonly Record<string, unknown>[];
  aiRecommendations: readonly Record<string, unknown>[];
}>;

export type SentinelAnalyticsSnapshot = Readonly<{
  dispatchToArrivalAvgMin: number | null;
  etaAccuracyMaeMin: number | null;
  alarms: {
    openCount: number;
    escalatedCount: number;
    medianAckSeconds: number | null;
  };
  dataQuality: {
    missingDataRate: number;
    inboundCount: number;
  };
  ai: {
    acceptanceRate: number | null;
    pendingReviews: number;
  };
  outbox: {
    pending: number;
    failed: number;
    oldestPendingAt: string | null;
  };
  episodeCount: number;
}>;

export class SentinelCapabilityUnavailableError extends Error {
  readonly code = 'SENTINEL_CAPABILITY_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'SentinelCapabilityUnavailableError';
  }
}
