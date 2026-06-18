import { normalizeEmergencyRole } from './emergencyRolePermissions';
import { isReceptionFirstUxEnabled } from './receptionFirstUx.config';
import { isReceptionDeskUiEnabled, RECEPTION_DESK_UI } from './receptionDeskUi.config';

export function resolveReceptionDeskUi({ role, isReceptionRoute = false } = {}) {
  const enabled = isReceptionDeskUiEnabled() && isReceptionFirstUxEnabled() && isReceptionRoute;
  const normalizedRole = normalizeEmergencyRole(role);
  const slim =
    enabled && RECEPTION_DESK_UI.slimRoles.includes(normalizedRole);
  const hiddenSurfaces = slim ? new Set(RECEPTION_DESK_UI.slimHiddenSurfaces) : new Set();

  return {
    enabled,
    slim,
    role: normalizedRole,
    show(surfaceId) {
      if (!surfaceId) return true;
      return !hiddenSurfaces.has(surfaceId);
    },
    stripMetricIds: slim ? RECEPTION_DESK_UI.coreStripMetricIds : null,
  };
}

export function filterReceptionStripMetrics(metrics = [], stripMetricIds = null) {
  if (!stripMetricIds?.length) return metrics;
  const allowed = new Set(stripMetricIds);
  return metrics.filter((metric) => allowed.has(metric.id));
}
