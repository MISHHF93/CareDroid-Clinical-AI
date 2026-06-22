import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { EMS_SCREEN_WIDGETS } from '../../config/emsScreenModel';
import { summarizeEmsAwareness } from '../whiteboard/emsAwarenessModel';

export const EMS_WORKFLOW_SURFACES = Object.freeze([
  EMS_SCREEN_WIDGETS.inboundAmbulances,
  EMS_SCREEN_WIDGETS.etaDisplay,
  EMS_SCREEN_WIDGETS.receivingArea,
  EMS_SCREEN_WIDGETS.offloadTimers,
  EMS_SCREEN_WIDGETS.emsPressure,
]);

export function isEmsRole(roleId) {
  return roleId === EMERGENCY_ROLE_IDS.emsUser;
}

export function shouldShowEmsOperationalStrip({ screenMode, roleId, displayMode = false } = {}) {
  if (displayMode) return false;
  return screenMode === CARE_DROID_SCREEN_MODES.ems || isEmsRole(roleId);
}

/**
 * EMS command strip — inbound units, ETA, receiving area, offload, and pressure.
 */
export function selectEmsOperationalStrip({
  emsArrivals = [],
  patients = [],
  staff = [],
  rooms = [],
  offloadTargetMinutes = 15,
  visibleSurfaces = null,
  now = Date.now(),
} = {}) {
  const summary = summarizeEmsAwareness(emsArrivals, now, {
    patients,
    staff,
    rooms,
    offloadTargetMinutes,
  });

  const metrics = [
    {
      id: 'inbound',
      label: 'Inbound',
      hint: 'Active ambulance units en route',
      value: summary.inboundCount,
      surface: EMS_SCREEN_WIDGETS.inboundAmbulances,
      tone: summary.inboundCount >= 3 ? 'warning' : summary.inboundCount ? 'info' : 'neutral',
      whiteboardAction: 'focus-inbound',
      routeKey: 'inbound',
    },
    {
      id: 'eta',
      label: 'Next ETA',
      hint: summary.soonestEtaLabel ? `Soonest arrival ${summary.soonestEtaLabel}` : 'No inbound ETA',
      value: summary.soonestEtaLabel || '—',
      surface: EMS_SCREEN_WIDGETS.etaDisplay,
      tone:
        summary.soonestEtaMinutes !== null && summary.soonestEtaMinutes <= 10
          ? 'critical'
          : summary.soonestEtaMinutes !== null && summary.soonestEtaMinutes <= 20
            ? 'warning'
            : 'info',
      whiteboardAction: 'focus-inbound',
      routeKey: 'eta',
    },
    {
      id: 'receiving',
      label: 'Receiving',
      hint: 'Crews awaiting handoff in the receiving area',
      value: summary.awaitingHandoff,
      surface: EMS_SCREEN_WIDGETS.receivingArea,
      tone: summary.awaitingHandoff >= 2 ? 'warning' : summary.awaitingHandoff ? 'info' : 'neutral',
      whiteboardAction: 'focus-receiving-area',
      routeKey: 'receiving',
    },
    {
      id: 'offload',
      label: 'Offload',
      hint:
        summary.longestOffloadMinutes != null
          ? `Longest offload ${summary.longestOffloadMinutes}m`
          : 'Offload timer status',
      value: summary.delayedOffloadCount || summary.awaitingHandoff || 0,
      surface: EMS_SCREEN_WIDGETS.offloadTimers,
      tone:
        (summary.longestOffloadMinutes ?? 0) >= offloadTargetMinutes
          ? 'critical'
          : summary.delayedOffloadCount
            ? 'warning'
            : 'neutral',
      whiteboardAction: 'open-offload-tracker',
      routeKey: 'offload',
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
