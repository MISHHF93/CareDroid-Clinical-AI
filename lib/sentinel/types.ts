/**
 * CareDroid Sentinel — shared domain contracts (frontend + backend pure engines).
 * No Nest/React imports. All AI recommendations require human review.
 */

export const SENTINEL_ORCHESTRATOR_VERSION = '2026.07.11' as const;

export type SentinelUnitType = 'ALS' | 'BLS' | 'Air' | 'Hazmat' | 'MCI' | 'Other';

export type SentinelUnitStatus =
  | 'available'
  | 'assigned'
  | 'en_route_scene'
  | 'on_scene'
  | 'transporting'
  | 'at_hospital'
  | 'handoff'
  | 'out_of_service'
  | 'offline';

export type SentinelFreshness = 'fresh' | 'stale' | 'offline';

export type SentinelCoordinates = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type SentinelEtaResult = Readonly<{
  etaPointMin: number;
  etaLowMin: number;
  etaHighMin: number;
  confidence: number;
  method: 'haversine_speed' | 'route_distance' | 'static_dispatch' | 'stale_hold';
  inputsHash: string;
  calculatedAt: string;
  distanceKm: number;
  stale: boolean;
}>;

export type SentinelGeofenceKind = 'hospital_approach' | 'bay' | 'staging' | 'custom';

export type SentinelPolygonRing = ReadonlyArray<SentinelCoordinates>;

export type SentinelAlarmSeverity = 'critical' | 'warning' | 'info';
export type SentinelAlarmUrgency = 'immediate' | 'soon' | 'routine';
export type SentinelAlarmStatus =
  | 'open'
  | 'acknowledged'
  | 'escalated'
  | 'suppressed'
  | 'resolved'
  | 'dismissed'
  | 'expired';

export type SentinelAiEvidence = Readonly<{
  claim: string;
  sourceRef: string;
  observedAt?: string;
}>;

export type SentinelAiHumanReviewStatus = 'pending' | 'accepted' | 'rejected' | 'modified';

/**
 * Mandatory envelope for every Sentinel AI recommendation.
 * `requiresHumanReview` is always true — no autonomous clinical decisions.
 */
export type SentinelAiRecommendation = Readonly<{
  id: string;
  kind: string;
  summary: string;
  recommendations: readonly string[];
  evidence: readonly SentinelAiEvidence[];
  confidence: number;
  modelId: string;
  modelVersion: string;
  orchestratorVersion: typeof SENTINEL_ORCHESTRATOR_VERSION;
  requiresHumanReview: true;
  humanReviewStatus: SentinelAiHumanReviewStatus;
  disclaimer: string;
  sourceState: 'live' | 'degraded' | 'rules_only';
  generatedAt: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
}>;

export type SentinelDomainEventType =
  | 'UnitPositionReceived'
  | 'UnitStatusChanged'
  | 'EtaRecalculated'
  | 'GeofenceEntered'
  | 'GeofenceExited'
  | 'InboundPatientUpserted'
  | 'EmsEpisodeTransitioned'
  | 'AlarmRaised'
  | 'AlarmAcknowledged'
  | 'AlarmEscalated'
  | 'AlarmSuppressed'
  | 'AlarmExpired'
  | 'AiRecommendationProduced'
  | 'HandoffCompleted';

export type SentinelDomainEvent = Readonly<{
  type: SentinelDomainEventType;
  eventId: string;
  occurredAt: string;
  organizationId?: string;
  workspaceId?: string;
  source: string;
  sourceEventId?: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export type CadAvlEventKind =
  | 'position'
  | 'status'
  | 'dispatch'
  | 'cancel'
  | 'heartbeat';

export type CadAvlEvent = Readonly<{
  kind: CadAvlEventKind;
  eventId: string;
  vendorId: string;
  unitExternalId: string;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  heading?: number;
  speedKmh?: number;
  status?: SentinelUnitStatus;
  sequence?: number;
  raw?: Readonly<Record<string, unknown>>;
}>;

export type AdapterHealth = Readonly<{
  vendorId: string;
  healthy: boolean;
  lastEventAt: string | null;
  detail: string;
}>;

export const SENTINEL_AI_DISCLAIMER =
  'AI output is decision support only. A licensed clinician must review every recommendation before acting. Not for autonomous clinical decision-making.';

export const SENTINEL_REQUIRED_PREARRIVAL_FIELDS = Object.freeze([
  'unitId',
  'chiefComplaint',
  'etaMinutes',
  'priorityOrTriage',
  'vitalsOrNarrative',
] as const);

export type SentinelMissingField = (typeof SENTINEL_REQUIRED_PREARRIVAL_FIELDS)[number];
