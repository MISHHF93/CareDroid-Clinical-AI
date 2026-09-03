/**
 * Integration status helpers — re-exports registry + backend capability rollup.
 */
export {
  INTEGRATION_STATUS,
  INTEGRATION_CATEGORY,
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_STATUS_GUIDANCE,
  INTEGRATION_POINT_REGISTRY,
  normalizeIntegrationStatusLabel,
  groupIntegrationsByCategory,
  summarizeCategoryStatus,
  buildIntegrationCategorySummaries,
  mergeRegistryWithLiveSources,
  mapLiveSourceStatusToNormalized,
  auditIntegrationDiscovery,
} from './integrationStatusRegistry';

import { BACKEND_CAPABILITY_STATUS, getBackendCapabilityStatus } from './backendApiCapabilities';
import { INTEGRATION_STATUS } from './integrationStatusRegistry';

export function capabilityRollupStatus(capability) {
  if (!capability) return null;
  const backendStatus = getBackendCapabilityStatus(capability);
  if (backendStatus === BACKEND_CAPABILITY_STATUS.REAL) return INTEGRATION_STATUS.IMPLEMENTED;
  if (backendStatus === BACKEND_CAPABILITY_STATUS.DEMO) return INTEGRATION_STATUS.PARTIAL;
  return INTEGRATION_STATUS.PLACEHOLDER;
}
