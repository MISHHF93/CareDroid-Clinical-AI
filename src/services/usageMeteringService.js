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

export function recordAssetLaunchUsage(plan, metadata = {}) {
  const assetId = plan?.registryId || metadata.assetId;
  if (!assetId) return;

  void recordUsageEvent({
    eventType: eventTypeForLaunch(plan),
    assetId,
    quantity: 1,
    metadata: {
      mode: plan?.mode,
      pathname: plan?.pathname,
      search: plan?.search,
      ...metadata,
    },
  });
}
