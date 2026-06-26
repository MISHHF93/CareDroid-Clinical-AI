import {
  buildRoleTelemetryContext,
  buildSafeSearchBehaviorPayload,
  ROLE_INTELLIGENCE_SIGNALS,
} from '../data/roleIntelligenceLayer';
import analyticsService from './analyticsService';
import { recordAssetLaunchUsage, USAGE_EVENT_TYPES } from './usageMeteringService';

function safeId(value) {
  return String(value || '').trim() || undefined;
}

function trackRoleEvent(eventName, parameters) {
  analyticsService.trackEvent({
    eventName,
    parameters: {
      roleSignal: eventName,
      ...parameters,
    },
  });
}

export function trackRoleAssetUsage(plan, { profile, source, eventType, metadata }: any = {}) {
  const assetId = safeId(plan?.registryId || metadata?.assetId);
  if (!assetId) return;
  const context = buildRoleTelemetryContext(profile);
  const payload = {
    ...context,
    assetId,
    route: plan?.pathname,
    mode: plan?.mode,
    source: source || metadata?.source || 'asset-launch',
    ...metadata,
  };

  recordAssetLaunchUsage(plan, {
    ...payload,
    eventType: eventType || metadata?.eventType,
    roleSignal: ROLE_INTELLIGENCE_SIGNALS.ASSET_USAGE,
  });
  trackRoleEvent(ROLE_INTELLIGENCE_SIGNALS.ASSET_USAGE, payload);
}

export function trackRoleSearchBehavior({ search, resultCount, filter, profile, source }: any = {}) {
  const payload = {
    ...buildSafeSearchBehaviorPayload({ search, resultCount, filter, profile }),
    source: source || 'search',
  };
  if (!payload.hasSearch && filter === 'all') return;
  trackRoleEvent(ROLE_INTELLIGENCE_SIGNALS.SEARCH_BEHAVIOR, payload);
}

export function trackRoleAiRequest({ profile, agentId, toolId, source, route = '/assistant' }: any = {}) {
  trackRoleEvent(ROLE_INTELLIGENCE_SIGNALS.AI_REQUEST, {
    ...buildRoleTelemetryContext(profile),
    agentId: safeId(agentId),
    toolId: safeId(toolId),
    route,
    source: source || 'assistant',
  });
}

export function trackRoleSimulationCompleted({
  profile,
  scenarioId,
  progress,
  safetyScore,
  selectedActionCount,
  criticalActionCount,
}: any = {}) {
  const context = buildRoleTelemetryContext(profile);
  const payload = {
    ...context,
    scenarioId: safeId(scenarioId),
    progress: Number.isFinite(progress) ? progress : 0,
    safetyScore: Number.isFinite(safetyScore) ? safetyScore : undefined,
    selectedActionCount: Number.isFinite(selectedActionCount) ? selectedActionCount : undefined,
    criticalActionCount: Number.isFinite(criticalActionCount) ? criticalActionCount : undefined,
    source: 'simulation-player',
  };

  recordAssetLaunchUsage(
    { registryId: scenarioId, mode: 'simulation-completed', pathname: `/simulation/${scenarioId}` },
    {
      ...payload,
      eventType: USAGE_EVENT_TYPES.SIMULATION,
      roleSignal: ROLE_INTELLIGENCE_SIGNALS.SIMULATION_COMPLETED,
    },
  );
  trackRoleEvent(ROLE_INTELLIGENCE_SIGNALS.SIMULATION_COMPLETED, payload);
}

export function trackRoleWorkflowLaunch({ profile, workflowId, assetId, route, source }: any = {}) {
  const id = safeId(workflowId || assetId);
  if (!id) return;
  const payload = {
    ...buildRoleTelemetryContext(profile),
    workflowId: id,
    assetId: safeId(assetId),
    route,
    source: source || 'workflow-launch',
  };

  recordAssetLaunchUsage(
    { registryId: id, mode: 'workflow', pathname: route || '/workflows' },
    {
      ...payload,
      eventType: USAGE_EVENT_TYPES.TOOL_LAUNCH,
      roleSignal: ROLE_INTELLIGENCE_SIGNALS.WORKFLOW_LAUNCHED,
    },
  );
  trackRoleEvent(ROLE_INTELLIGENCE_SIGNALS.WORKFLOW_LAUNCHED, payload);
}
