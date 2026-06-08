import { recordUsageEvent } from './subscriptionApi';

export const USAGE_EVENT_TYPES = Object.freeze({
  AI_CALL: 'ai_call',
  TOOL_LAUNCH: 'tool_launch',
  CALCULATOR_LAUNCH: 'calculator_launch',
  SIMULATION: 'simulation',
  MAP_USAGE: 'map_usage',
  IOT_TELEMETRY: 'iot_telemetry',
  STORAGE: 'storage',
  API_CALL: 'api_call',
  ACTIVE_USER: 'active_user',
});

export const ASSET_UTILIZATION_EVENT_TYPES = Object.freeze({
  ASSET_LAUNCHED: 'asset_launched',
  ASSET_DURATION: 'asset_duration',
  ASSET_ABANDONED: 'asset_abandoned',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  WORKFLOW_COMPLETED: 'workflow_completed',
});

const ASSET_SESSION_STORAGE_KEY = 'careDroid.assetUtilizationSession.v1';
const ASSET_SESSION_ID_STORAGE_KEY = 'careDroid.assetUtilizationSessionId.v1';
const ABANDONMENT_THRESHOLD_SECONDS = 15;

function eventTypeForLaunch(plan) {
  const path = `${plan?.pathname || ''}${plan?.search || ''}`.toLowerCase();
  if (path.includes('/calculators') || path.includes('calc=')) return USAGE_EVENT_TYPES.CALCULATOR_LAUNCH;
  if (path.includes('/simulation')) return USAGE_EVENT_TYPES.SIMULATION;
  if (path.includes('/map') || path.includes('/live-map') || path.includes('/hospital-map')) {
    return USAGE_EVENT_TYPES.MAP_USAGE;
  }
  if (path.includes('/medical-iot') || path.includes('/devices')) return USAGE_EVENT_TYPES.IOT_TELEMETRY;
  return USAGE_EVENT_TYPES.TOOL_LAUNCH;
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function getAssetUtilizationSessionId() {
  if (!canUseBrowserStorage()) return undefined;
  try {
    const existing = window.sessionStorage.getItem(ASSET_SESSION_ID_STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `asset-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem(ASSET_SESSION_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function readCurrentAssetSession() {
  if (!canUseBrowserStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(ASSET_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCurrentAssetSession(session) {
  if (!canUseBrowserStorage()) return;
  try {
    window.sessionStorage.setItem(ASSET_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Best-effort telemetry must not block product usage.
  }
}

function clearCurrentAssetSession() {
  if (!canUseBrowserStorage()) return;
  try {
    window.sessionStorage.removeItem(ASSET_SESSION_STORAGE_KEY);
  } catch {
    // Best-effort telemetry must not block product usage.
  }
}

function assetIdFor(plan, metadata = {}) {
  return plan?.registryId || metadata.assetId || metadata.workflowId || metadata.recommendationId;
}

function secondsSince(startedAt) {
  const started = Number(startedAt);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.round((Date.now() - started) / 1000));
}

function normalizeBehaviorMetadata(plan, behaviorEventType, metadata = {}) {
  const {
    eventType,
    usageEventType,
    quantity,
    unit,
    idempotencyKey,
    meterId,
    source,
    ...safeMetadata
  } = metadata;

  return {
    usageEventType: usageEventType || eventType || eventTypeForLaunch(plan),
    quantity,
    unit,
    idempotencyKey,
    meterId,
    source,
    safeMetadata: {
      ...safeMetadata,
      eventType: behaviorEventType,
      assetId: assetIdFor(plan, metadata),
      route: plan?.pathname,
      mode: plan?.mode,
      search: plan?.search,
      source: source || safeMetadata.source,
      sessionId: metadata.sessionId || getAssetUtilizationSessionId(),
    },
  };
}

export function recordBehavioralAssetUsage(plan, behaviorEventType, metadata = {}) {
  const assetId = assetIdFor(plan, metadata);
  if (!assetId) return;

  const normalized = normalizeBehaviorMetadata(plan, behaviorEventType, metadata);
  void recordUsageEvent({
    eventType: normalized.usageEventType,
    assetId,
    quantity: normalized.quantity ?? 0,
    unit: normalized.unit || 'event',
    idempotencyKey: normalized.idempotencyKey,
    meterId: normalized.meterId,
    source: normalized.source || normalized.safeMetadata.source,
    metadata: normalized.safeMetadata,
  });
}

export function closeCurrentAssetUsageSession(reason = 'closed', metadata = {}) {
  const session = readCurrentAssetSession();
  if (!session?.assetId) return;

  const durationSeconds = metadata.durationSeconds ?? secondsSince(session.startedAt);
  const plan = {
    registryId: session.assetId,
    mode: session.mode,
    pathname: session.pathname,
    search: session.search,
  };
  const baseMetadata = {
    ...session.metadata,
    ...metadata,
    assetId: session.assetId,
    sessionId: session.sessionId,
    source: metadata.source || session.source || 'asset-session',
    usageEventType: session.usageEventType,
    durationSeconds,
    closeReason: reason,
  };

  recordBehavioralAssetUsage(plan, ASSET_UTILIZATION_EVENT_TYPES.ASSET_DURATION, baseMetadata);
  if (durationSeconds < ABANDONMENT_THRESHOLD_SECONDS && reason !== 'completed') {
    recordBehavioralAssetUsage(plan, ASSET_UTILIZATION_EVENT_TYPES.ASSET_ABANDONED, {
      ...baseMetadata,
      abandonmentThresholdSeconds: ABANDONMENT_THRESHOLD_SECONDS,
    });
  }
  clearCurrentAssetSession();
}

let assetSessionHandlersRegistered = false;

function registerAssetSessionCloseHandlers() {
  if (assetSessionHandlersRegistered || typeof window === 'undefined') return;
  assetSessionHandlersRegistered = true;
  window.addEventListener('pagehide', () => closeCurrentAssetUsageSession('pagehide'));
}

function startAssetUsageSession(plan, metadata = {}) {
  const assetId = assetIdFor(plan, metadata);
  if (!assetId || !canUseBrowserStorage()) return;

  const existing = readCurrentAssetSession();
  if (existing?.assetId) {
    closeCurrentAssetUsageSession('superseded');
  }

  registerAssetSessionCloseHandlers();
  writeCurrentAssetSession({
    assetId,
    startedAt: Date.now(),
    sessionId: getAssetUtilizationSessionId(),
    mode: plan?.mode,
    pathname: plan?.pathname,
    search: plan?.search,
    source: metadata.source,
    usageEventType: metadata.usageEventType || metadata.eventType || eventTypeForLaunch(plan),
    metadata: {
      roleSignal: metadata.roleSignal,
      assetType: metadata.assetType,
      category: metadata.category,
      recommendationId: metadata.recommendationId,
      recommendationType: metadata.recommendationType,
    },
  });
}

export function recordAssetLaunchUsage(plan, metadata = {}) {
  const assetId = plan?.registryId || metadata.assetId;
  if (!assetId) return;
  const { eventType, usageEventType, behaviorEventType, ...safeMetadata } = metadata;
  const resolvedUsageEventType = usageEventType || eventType || eventTypeForLaunch(plan);

  void recordUsageEvent({
    eventType: resolvedUsageEventType,
    assetId,
    quantity: 1,
    metadata: {
      eventType: behaviorEventType || ASSET_UTILIZATION_EVENT_TYPES.ASSET_LAUNCHED,
      mode: plan?.mode,
      pathname: plan?.pathname,
      search: plan?.search,
      sessionId: getAssetUtilizationSessionId(),
      ...safeMetadata,
    },
  });
  startAssetUsageSession(plan, { ...safeMetadata, usageEventType: resolvedUsageEventType });
}

export function recordAssetRecommendationAccepted({
  recommendation,
  assetId,
  route,
  source = 'recommendations',
  usageEventType,
} = {}) {
  const resolvedAssetId = assetId || recommendation?.item?.id || recommendation?.id;
  if (!resolvedAssetId) return;
  recordBehavioralAssetUsage(
    {
      registryId: resolvedAssetId,
      mode: recommendation?.type || 'recommendation',
      pathname: route || recommendation?.route,
      search: '',
    },
    ASSET_UTILIZATION_EVENT_TYPES.RECOMMENDATION_ACCEPTED,
    {
      usageEventType:
        usageEventType ||
        (recommendation?.type === 'aiAgents' ? USAGE_EVENT_TYPES.AI_CALL : USAGE_EVENT_TYPES.TOOL_LAUNCH),
      assetId: resolvedAssetId,
      recommendationId: recommendation?.id,
      recommendationType: recommendation?.type,
      recommendationScore: recommendation?.score,
      source,
    },
  );
}

export function recordWorkflowCompletion({
  workflowId,
  assetId,
  route = '/workflows',
  source = 'workflow-builder',
  blockCount,
  completionState = 'completed',
} = {}) {
  const resolvedAssetId = assetId || workflowId;
  if (!resolvedAssetId) return;
  closeCurrentAssetUsageSession('completed', {
    assetId: resolvedAssetId,
    source,
  });
  recordBehavioralAssetUsage(
    { registryId: resolvedAssetId, mode: 'workflow', pathname: route, search: '' },
    ASSET_UTILIZATION_EVENT_TYPES.WORKFLOW_COMPLETED,
    {
      usageEventType: USAGE_EVENT_TYPES.TOOL_LAUNCH,
      assetId: resolvedAssetId,
      workflowId,
      route,
      source,
      blockCount,
      completionState,
    },
  );
}
