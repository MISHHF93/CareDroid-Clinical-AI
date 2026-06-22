/**
 * TrackMind module access — map intelligence / enterprise modules to permission keys.
 */
import { PLATFORM_INTELLIGENCE_MODULE } from './platformIntelligenceRegistry';
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';

const K = TRACKMIND_PERMISSION_KEYS;
const M = PLATFORM_INTELLIGENCE_MODULE;

export const TRACKMIND_INTELLIGENCE_MODULE_PERMISSION: Record<string, string> = Object.freeze({
  [M.UNIFIED_ARTIFACT_REGISTRY]: K.governanceRegistryView,
  [M.ARTIFACT_RELATIONSHIP_MAPPING]: K.intelligenceView,
  [M.ENTERPRISE_METADATA]: K.intelligenceView,
  [M.DATA_CATALOG]: K.analyticsView,
  [M.DATA_LINEAGE]: K.analyticsView,
  [M.KPI_INTELLIGENCE]: K.analyticsView,
  [M.OPERATIONAL_INTELLIGENCE_GRAPH]: K.intelligenceView,
  [M.CROSS_DOMAIN_ANALYTICS]: K.analyticsView,
  [M.FORECASTING_READINESS]: K.analyticsView,
  [M.REPORTING_STUDIO]: K.analyticsExport,
  [M.TENANT_HEALTH]: K.platformAdminView,
  [M.TRACK_HEALTH]: K.kpiRaceDayView,
  [M.EXECUTIVE_COCKPIT]: K.executiveDashboardView,
  [M.FEDERATION_INTELLIGENCE]: K.kpiExecutiveView,
  [M.SAAS_OPERATIONS]: K.platformAdminView,
  [M.INTEGRATION_GOVERNANCE]: K.intelligenceView,
  [M.API_GOVERNANCE]: K.intelligenceView,
  [M.PLATFORM_OBSERVABILITY]: K.platformAdminView,
  [M.TECHNICAL_DEBT_REGISTRY]: K.intelligenceView,
  [M.PLATFORM_CONVERGENCE]: K.intelligenceView,
});

export function filterTrackMindIntelligenceModules<T extends { id: string }>(
  modules: readonly T[],
  can: (permission: string) => boolean,
): T[] {
  return modules.filter((module) => {
    const permission = TRACKMIND_INTELLIGENCE_MODULE_PERMISSION[module.id];
    return !permission || can(permission);
  });
}

export function filterTrackMindNavItems<T extends { id: string; trackMindPermission?: string }>(
  items: readonly T[],
  can: (permission: string) => boolean,
): T[] {
  return items.filter((item) => {
    if (!item.trackMindPermission) return true;
    return can(item.trackMindPermission);
  });
}
