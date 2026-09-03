import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { EMS_SCREEN_WIDGETS } from '../../config/emsScreenModel';
import { selectEmsOffloadVisibilityMetrics } from '../../services/emsOffloadVisibilityModel';
import { summarizeEmsAwareness } from '../whiteboard/emsAwarenessModel';

export const EMS_WORKFLOW_SURFACES = Object.freeze([
  EMS_SCREEN_WIDGETS.inboundAmbulances,
  EMS_SCREEN_WIDGETS.offloadTimers,
  EMS_SCREEN_WIDGETS.receivingArea,
  EMS_SCREEN_WIDGETS.emsPressure,
]);

export function isEmsRole(roleId) {
  return roleId === EMERGENCY_ROLE_IDS.emsUser;
}

export function shouldShowEmsOperationalStrip({
  screenMode,
  roleId,
  displayMode = false,
}: any = {}) {
  if (displayMode) return false;
  return screenMode === CARE_DROID_SCREEN_MODES.ems || isEmsRole(roleId);
}

/**
 * EMS command strip — inbound units, ETA, receiving area, offload, and pressure.
 */
export function selectEmsOperationalStrip({
  emsArrivals = [] as any[],
  patients = [] as any[],
  staff = [] as any[],
  rooms = [] as any[],
  offloadTargetMinutes = 15,
  visibleSurfaces = null,
  now = Date.now(),
}: any = {}) {
  const summary = summarizeEmsAwareness(emsArrivals, now, {
    patients,
    staff,
    rooms,
    offloadTargetMinutes,
  });

  const visibilityMetrics = selectEmsOffloadVisibilityMetrics(emsArrivals, {
    patients,
    staff,
    rooms,
    now: new Date(now),
    offloadTargetMinutes,
    surface: 'ems',
  });

  const visibilityById = Object.fromEntries(visibilityMetrics.map((metric) => [metric.id, metric]));

  const metrics = [
    {
      id: 'inbound',
      label: visibilityById.inbound?.label || 'Inbound',
      hint: visibilityById.inbound?.hint || 'Active ambulance units en route',
      value: visibilityById.inbound?.value ?? summary.inboundCount,
      surface: EMS_SCREEN_WIDGETS.inboundAmbulances,
      tone: visibilityById.inbound?.tone || (summary.inboundCount ? 'info' : 'neutral'),
      whiteboardAction: 'focus-inbound',
      routeKey: 'inbound',
    },
    {
      id: 'offload-delays',
      label: visibilityById.offload?.label || 'Offload delays',
      hint: visibilityById.offload?.hint || 'Units past offload target',
      value: visibilityById.offload?.value ?? summary.delayedOffloadCount,
      surface: EMS_SCREEN_WIDGETS.offloadTimers,
      tone: visibilityById.offload?.tone || 'neutral',
      whiteboardAction: 'open-offload-tracker',
      routeKey: 'offload',
    },
    {
      id: 'offload-duration',
      label: visibilityById['offload-duration']?.label || 'Offload duration',
      hint: visibilityById['offload-duration']?.hint || 'Mean scene-to-handoff offload time',
      value: visibilityById['offload-duration']?.value ?? '—',
      surface: EMS_SCREEN_WIDGETS.offloadTimers,
      tone: visibilityById['offload-duration']?.tone || 'neutral',
      whiteboardAction: 'open-offload-tracker',
      routeKey: 'offload-duration',
    },
    {
      id: 'handoff-pending',
      label: visibilityById.receiving?.label || 'Handoff pending',
      hint: visibilityById.receiving?.hint || 'Crews awaiting handoff completion',
      value: visibilityById.receiving?.value ?? summary.awaitingHandoff,
      surface: EMS_SCREEN_WIDGETS.receivingArea,
      tone: visibilityById.receiving?.tone || (summary.awaitingHandoff ? 'info' : 'neutral'),
      whiteboardAction: 'focus-receiving-area',
      routeKey: 'receiving',
    },
    {
      id: 'pressure',
      label: 'EMS pressure',
      hint: `Department EMS pressure band: ${summary.pressureBand}`,
      value: `${summary.pressureScore} ${summary.pressureBand}`,
      surface: EMS_SCREEN_WIDGETS.emsPressure,
      tone:
        summary.pressureBand === 'critical'
          ? 'critical'
          : summary.pressureBand === 'elevated' || summary.pressureBand === 'moderate'
            ? 'warning'
            : 'success',
      whiteboardAction: 'focus-ems-pressure',
      routeKey: 'pressure',
    },
  ];

  if (!visibleSurfaces?.length) return metrics;
  const allowed = new Set(visibleSurfaces);
  return metrics.filter((metric) => allowed.has(metric.surface));
}
