import { normalizeEmergencyRole } from './emergencyRolePermissions';
import { isReceptionFirstUxEnabled } from './receptionFirstUx.config';
import { isReceptionDeskUiEnabled, RECEPTION_DESK_UI } from './receptionDeskUi.config';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import { resolveReceptionStripMetricIds } from './emergencyScreenKpiPolicy';
import { isReceptionScreenMode } from './receptionScreenModel';
import { shouldForceSlimReceptionDeskForAllRoles } from './practitionerCleanup.config';

export function resolveReceptionDeskUi({ role, isReceptionRoute = false, screenMode }: any = {}) {
  const enabled =
    isReceptionDeskUiEnabled() &&
    isReceptionFirstUxEnabled() &&
    (isReceptionRoute || isReceptionScreenMode(screenMode || ''));
  const normalizedRole = normalizeEmergencyRole(role);
  const slim =
    enabled &&
    (shouldForceSlimReceptionDeskForAllRoles() ||
      isReceptionScreenMode(screenMode || '') ||
      RECEPTION_DESK_UI.slimRoles.includes(normalizedRole));
  const hiddenSurfaces = slim ? new Set(RECEPTION_DESK_UI.slimHiddenSurfaces) : new Set();

  return {
    enabled,
    slim,
    inlineQuickIntake:
      enabled && (RECEPTION_DESK_UI as any).inlineQuickIntakeForSlim !== false,
    role: normalizedRole,
    show(surfaceId) {
      if (!surfaceId) return true;
      return !hiddenSurfaces.has(surfaceId);
    },
    stripMetricIds: slim
      ? resolveReceptionStripMetricIds(CARE_DROID_SCREEN_MODES.reception) ||
        RECEPTION_DESK_UI.coreStripMetricIds
      : resolveReceptionStripMetricIds(CARE_DROID_SCREEN_MODES.reception),
  };
}

export function filterReceptionStripMetrics(metrics = [] as any[], stripMetricIds: any = null) {
  if (!(stripMetricIds as any)?.length) return metrics;
  const allowed = new Set(stripMetricIds);
  return metrics.filter((metric) => allowed.has(metric.id));
}
