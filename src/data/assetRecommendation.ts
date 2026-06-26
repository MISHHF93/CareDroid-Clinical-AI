import { getPlatformEntitlementContext } from './assetEntitlements';
import { ASSET_ACCESS_STATES, filterVisibleTools, getAssetAwareToolProjection } from './assetAccess';

const ROLE_SUGGESTIONS = Object.freeze({
  'emergency physician': ['qsofa', 'news2', 'heart-score', 'nihss', 'sofa-score', 'simulation-suite'],
  nurse: ['news2', 'mews', 'protocols'],
  pharmacist: ['drug-check', 'lab-interp', 'laboratory'],
  'fleet operator': ['fleet-dashboard', 'fleet-live-map', 'dispatch-ai'],
  'biomedical engineer': ['telemetry-monitoring', 'device-fleet-management', 'medical-iot'],
  administrator: ['audit-logs', 'analytics', 'system-config'],
  researcher: ['guideline-rag', 'research-evidence-hub'],
  'medical student': ['calculators', 'simulation-suite'],
});

export function getRoleBasedAssetRecommendations({ account, roleProfile, limit = 12 }: any = {}) {
  const context = getPlatformEntitlementContext();
  const userRole = account?.role || 'student';
  const tools = filterVisibleTools(getAssetAwareToolProjection(context, userRole));
  const byId = new Map(tools.map((t) => [t.id, t]));

  const roleKey = roleProfile?.id || account?.profession || account?.specialty || 'emergency physician';
  const ids = [
    ...(roleProfile?.preferredAssetIds || []),
    ...(ROLE_SUGGESTIONS[roleKey] || ROLE_SUGGESTIONS['emergency physician']),
    ...(context?.entitledAssetIds || []).slice(0, 15),
  ];

  const seen = new Set();
  const out = [] as any[];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const tool = byId.get(id);
    if (!tool || (tool as any).accessState === ASSET_ACCESS_STATES.LOCKED) continue;
    seen.add(id);
    out.push(tool);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildAssistantAssetContext({ account, roleProfile, platformContext }) {
  return {
    organization: platformContext?.organization?.name || account?.organization,
    organizationType: platformContext?.organization?.organizationType,
    workspaceType: platformContext?.workspace?.activeWorkspaceId,
    roleProfileId: roleProfile?.id,
    entitledPackIds: platformContext?.entitledPackIds || [],
    defaultAiAgentId: platformContext?.defaultAiAgentId || 'agent-clinical',
    recommendations: getRoleBasedAssetRecommendations({ account, roleProfile, limit: 8 }).map((t) => ({
      id: t.id,
      name: t.name,
      accessState: t.accessState,
    })),
  };
}
