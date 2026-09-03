import { ADMIN_AUTOMATION_ENTITLEMENT_ASSET_MAP } from './administrativeAutomationCatalog';
import {
  getPlatformEntitlementContext,
  isStrictSaasEntitlementsEnabled,
} from '../data/assetEntitlements';

export type AutomationEngineRuntimeContext = {
  entitledAssetIds?: string[];
  strictEntitlements?: boolean;
  subscriptionTier?: string;
  workspaceId?: string;
  tenant?: { id?: string; name?: string };
  humanReviewAvailable?: boolean;
  integrationsEnabled?: boolean;
};

/** Maps automation catalog ids to platform asset ids checked at runtime. */
export const AUTOMATION_ENTITLEMENT_ASSET_MAP: Readonly<Record<string, string>> = Object.freeze({
  ...ADMIN_AUTOMATION_ENTITLEMENT_ASSET_MAP,
  'emergency-automated-triage-matrix': 'agent-clinical',
  'emergency-referral-routing': 'agent-clinical',
  'emergency-surge-staffing': 'agent-operations',
  'emergency-simulation-academy': 'agent-education',
  'emergency-medical-iot-monitoring': 'medical-iot',
  'emergency-documentation-integrity': 'agent-clinical',
  'emergency-rag-evidence-retrieval': 'agent-research',
  'emergency-virtual-ed': 'agent-clinical',
  'emergency-discharge-summary-drafting': 'agent-clinical',
  'emergency-prior-authorization': 'agent-operations',
  'laboratory-abnormal-result-alert': 'agent-lab',
  'laboratory-specimen-delay-alert': 'agent-lab',
  'automation-news2-clinician-notification': 'automation-news2-clinician-notification',
  'automation-potassium-lab-workflow': 'automation-potassium-lab-workflow',
});

export function resolveAutomationEntitlementAssetId(automationId: string): string {
  return AUTOMATION_ENTITLEMENT_ASSET_MAP[automationId] || automationId;
}

export function buildAutomationEngineContext(
  overrides: AutomationEngineRuntimeContext = {},
): AutomationEngineRuntimeContext {
  const platform = getPlatformEntitlementContext() || {};
  const subscription =
    platform.subscription ||
    platform.currentSubscription ||
    platform.platformContext?.subscription ||
    {};

  return {
    entitledAssetIds: platform.entitledAssetIds || platform.enabledAssetIds || [],
    strictEntitlements: isStrictSaasEntitlementsEnabled(platform),
    subscriptionTier: subscription.tier || platform.subscriptionTier || 'professional',
    workspaceId:
      platform.workspace?.activeWorkspaceId ||
      platform.activeWorkspace?.id ||
      platform.workspaceId ||
      'emergency',
    tenant: {
      id: platform.organization?.id || platform.organizationId || platform.tenantId,
      name: platform.organization?.name || platform.organizationName,
    },
    humanReviewAvailable: true,
    integrationsEnabled: Boolean(platform.integrationsEnabled),
    ...overrides,
  };
}

export function isAutomationEntitled(
  automationId: string,
  context: { entitledAssetIds?: string[]; strictEntitlements?: boolean } = {},
): boolean {
  if (!context.strictEntitlements) return true;
  const entitled = context.entitledAssetIds || [];
  if (!entitled.length) return false;
  const assetId = resolveAutomationEntitlementAssetId(automationId);
  return entitled.includes(assetId) || entitled.includes(automationId);
}

export function filterEntitledAutomationIds(
  automationIds: string[],
  context: AutomationEngineRuntimeContext = buildAutomationEngineContext(),
): string[] {
  return automationIds.filter((automationId) => isAutomationEntitled(automationId, context));
}
