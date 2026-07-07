import {
  THREE_MINUTE_MISSION_PRINCIPLE,
  THREE_MINUTE_MISSION_TARGET_SECONDS,
  buildDefaultMissionTasks,
  emsPreArrivalSubjectId,
  getThreeMinuteMissionDefinition,
  type ThreeMinuteMission,
  type ThreeMinuteMissionSnapshot,
  type ThreeMinuteMissionTrigger,
} from '../config/threeMinuteMissionModel';
import {
  acknowledgeResponseTimer,
  acknowledgeTimerForPatient,
  getActiveTimerForPatient,
  getAllActiveTimers,
  getTimerState,
  startResponseTimer,
  type ResponseTimerState,
} from '../engine/threeMinuteTimerEngine';
import { getThreeMinuteMissionStoreState } from '../store/threeMinuteMissionStore';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Alert, type EMSArrival, type Patient } from '../types/emergency';

export type StartThreeMinuteMissionInput = Readonly<{
  trigger: ThreeMinuteMissionTrigger;
  subjectId: string;
  triggerAlertId: string;
  ownerRole?: string;
  subjectLabel?: string;
  patientId?: string;
  emsArrivalId?: string;
}>;

function elapsedSeconds(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function resolveSubjectLabel(
  patientId: string | undefined,
  emsArrivalId: string | undefined,
  fallback?: string,
): string {
  if (fallback) return fallback;
  const store = useEmergencyStore.getState();
  if (patientId && !patientId.startsWith('ems:')) {
    const patient = store.patients.find((entry) => entry.id === patientId);
    if (patient) return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.id;
  }
  if (emsArrivalId) {
    const arrival = store.emsArrivals.find((entry) => entry.id === emsArrivalId);
    if (arrival) return `${arrival.unitName} — ${arrival.chiefComplaint || 'Inbound EMS'}`;
  }
  return patientId || emsArrivalId || 'Critical case';
}

function timerToMission(timer: ResponseTimerState, trigger: ThreeMinuteMissionTrigger): ThreeMinuteMission {
  const definition = getThreeMinuteMissionDefinition(trigger);
  const patientId = timer.patientId.startsWith('ems:') ? undefined : timer.patientId;
  const emsArrivalId = timer.patientId.startsWith('ems:') ? timer.patientId.slice(4) : undefined;
  const existing = getThreeMinuteMissionStoreState().missions.find((mission) => mission.timerId === timer.timerId);

  const tasks = existing?.tasks
    ? existing.tasks.map((task) => {
        if (timer.acknowledgedAt && (task.id === 'acknowledge' || task.id === 'clinical_response')) {
          return { ...task, status: 'complete' as const, completedAt: timer.acknowledgedAt, completedBy: timer.acknowledgedBy };
        }
        if (timer.escalationHistory.length && task.id === 'notify_department') {
          return { ...task, status: 'complete' as const, completedAt: timer.escalationHistory[0]?.firedAt };
        }
        return task;
      })
    : buildDefaultMissionTasks(trigger, timer.ownerRole);

  return Object.freeze({
    missionId: existing?.missionId ?? `tm-mission-${timer.timerId}`,
    timerId: timer.timerId,
    patientId,
    emsArrivalId,
    subjectLabel: existing?.subjectLabel ?? resolveSubjectLabel(patientId, emsArrivalId),
    trigger: existing?.trigger ?? trigger,
    triggerAlertId: timer.triggerAlertId,
    startedAt: timer.startedAt,
    phase: timer.phase,
    ownerRole: timer.ownerRole,
    acknowledgedAt: timer.acknowledgedAt,
    acknowledgedBy: timer.acknowledgedBy,
    breachAt: timer.breachAt,
    tasks,
    departmentsNotified: definition.departmentNotifications,
    route: definition.route,
    aiIntent: definition.aiIntent,
    humanReviewRequired: true as const,
    advisoryOnly: true as const,
  });
}

function inferTriggerFromTimer(timer: ResponseTimerState): ThreeMinuteMissionTrigger {
  const stored = getThreeMinuteMissionStoreState().missions.find((mission) => mission.timerId === timer.timerId);
  if (stored) return stored.trigger;
  if (timer.patientId.startsWith('ems:')) return 'ems_pre_arrival';
  const store = useEmergencyStore.getState();
  const alert = store.alerts.find((entry) => entry.id === timer.triggerAlertId);
  if (alert?.source === 'three-minute-timer-engine') return 'critical_alert';
  if (alert?.severity === 'Critical') return 'critical_alert';
  const patient = store.patients.find((entry) => entry.id === timer.patientId);
  if (patient?.flags?.includes(PatientFlag.ReassessmentDue)) return 'reassessment_breach';
  return 'critical_patient';
}

/**
 * Cheap content signature for change detection. timerToMission() always
 * returns freshly frozen objects (and re-maps `tasks` every call), so
 * reference equality is useless here — this compares the fields that
 * actually affect rendering.
 */
function missionSignature(missions: readonly ThreeMinuteMission[]): string {
  return missions
    .map(
      (mission) =>
        `${mission.missionId}:${mission.phase}:${mission.acknowledgedAt ?? ''}:${mission.breachAt ?? ''}:${mission.tasks
          .map((task) => `${task.id}=${task.status}`)
          .join(',')}`,
    )
    .join('|');
}

/**
 * setMissions() unconditionally writes a brand-new array reference to the
 * store (see store/threeMinuteMissionStore.ts's `[...missions]` spread), and
 * this function is called from inside a useMemo on every render of
 * ThreeMinuteMissionBar / WorkflowAutomationCommandBar (via
 * buildThreeMinuteMissionSnapshot). Writing on every call — even when
 * nothing changed — created a render loop: memo runs -> writes store ->
 * store notifies the same component's `missions` selector -> re-render ->
 * memo runs again -> writes store again -> ... (observed in practice as a
 * React "Maximum update depth exceeded" error that pegged the main thread).
 * Skipping the write when the computed missions are unchanged breaks the
 * cycle without changing what any caller receives (they still get a fresh,
 * correct array back from this function every time).
 */
export function syncThreeMinuteMissionsFromEngine(): readonly ThreeMinuteMission[] {
  const missions = getAllActiveTimers().map((timer) => timerToMission(timer, inferTriggerFromTimer(timer)));
  const store = getThreeMinuteMissionStoreState();
  if (missionSignature(missions) !== missionSignature(store.missions)) {
    // Deferred by a microtask so the write always lands after React finishes
    // the current commit, not mid-render for whichever sibling component
    // happens to still be processing in the same batch. Two independent
    // useThreeMinuteMission() instances (ThreeMinuteMissionBar and
    // WorkflowAutomationCommandBar, via useUnifiedWorkflowAutomation) each
    // run this from their own mount effect, and on the very first commit
    // one's synchronous store write could otherwise land while the other was
    // still rendering (a one-time "Cannot update a component while rendering
    // a different component" warning, not a loop). Re-checking the signature
    // against the latest store state avoids clobbering a write that already
    // happened in between.
    queueMicrotask(() => {
      const latest = getThreeMinuteMissionStoreState();
      if (missionSignature(missions) !== missionSignature(latest.missions)) {
        latest.setMissions(missions);
      }
    });
  }
  return missions;
}

export function startThreeMinuteMission(input: StartThreeMinuteMissionInput): ThreeMinuteMission | null {
  const ownerRole = input.ownerRole ?? getThreeMinuteMissionDefinition(input.trigger).defaultOwnerRole;
  const timerId = startResponseTimer(input.subjectId, input.triggerAlertId, ownerRole);
  const timer = getTimerState(timerId);
  if (!timer) return null;

  const mission = timerToMission(timer, input.trigger);
  const enriched = Object.freeze({
    ...mission,
    subjectLabel: input.subjectLabel ?? mission.subjectLabel,
    patientId: input.patientId,
    emsArrivalId: input.emsArrivalId,
  });
  getThreeMinuteMissionStoreState().upsertMission(enriched);
  void import('./observabilityTrace').then(({ startWorkflowTrace }) => {
    const trace = startWorkflowTrace('three-minute-mission-start', {
      source: 'threeMinuteMissionService',
      patientId: input.patientId,
      summary: `Three-minute mission started (${input.trigger})`,
      metadata: {
        trigger: input.trigger,
        subjectId: input.subjectId,
        timerId,
      },
    });
    trace.end('success', { ownerRole });
  });
  return enriched;
}

export function shouldStartMissionForPatient(patient: Patient): boolean {
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) return false;
  const isCriticalAcuity = patient.priority === Priority.P1 || patient.priority === Priority.P2;
  const hasRedFlags =
    (patient.highRiskComplaintFlags?.length ?? 0) > 0 ||
    (patient.flags || []).some((flag) =>
      [PatientFlag.SepsisAlert, PatientFlag.DeteriorationRisk, PatientFlag.HighRisk, PatientFlag.StrokeCode].includes(
        flag as PatientFlag,
      ),
    );
  const inEarlyFlow = [PatientState.Arrival, PatientState.Registration, PatientState.Triage, PatientState.Waiting].includes(
    patient.state,
  );
  return isCriticalAcuity && inEarlyFlow && (hasRedFlags || Boolean(patient.triagePending));
}

export function shouldStartMissionForEmsArrival(arrival: EMSArrival): boolean {
  if (arrival.patientId) return false;
  if (['Complete', 'Cancelled'].includes(arrival.status)) return false;
  return arrival.severity === 'Critical' || arrival.severity === 'High' || Boolean(arrival.criticalChecklist);
}

export function shouldStartMissionForAlert(alert: Alert): boolean {
  return Boolean(alert.patientId) && alert.severity === 'Critical' && !alert.dismissed && alert.source !== 'three-minute-timer-engine';
}

export function acknowledgeThreeMinuteMission(
  missionId: string,
  acknowledgedBy: string,
  options: { acknowledgeLinkedAlert?: boolean } = {},
): boolean {
  const mission = getThreeMinuteMissionStoreState().missions.find((entry) => entry.missionId === missionId);
  if (!mission) return false;

  const subjectId = mission.patientId ?? (mission.emsArrivalId ? emsPreArrivalSubjectId(mission.emsArrivalId) : null);
  if (!subjectId) return false;

  const acknowledged = mission.patientId
    ? acknowledgeTimerForPatient(mission.patientId, acknowledgedBy)
    : acknowledgeResponseTimer(mission.timerId, acknowledgedBy);
  if (!acknowledged) return false;

  if (options.acknowledgeLinkedAlert !== false && mission.triggerAlertId) {
    useEmergencyStore.getState().acknowledgeAlert(mission.triggerAlertId);
  }

  const store = useEmergencyStore.getState();
  store.recordWorkflowAction?.({
    type: 'three_minute_mission_acknowledged',
    summary: `3-minute mission acknowledged for ${mission.subjectLabel}`,
    patientId: mission.patientId,
    source: 'three-minute-mission',
    metadata: {
      missionId,
      trigger: mission.trigger,
      elapsedSeconds: elapsedSeconds(mission.startedAt),
      ownerRole: mission.ownerRole,
    },
  });

  syncThreeMinuteMissionsFromEngine();
  getThreeMinuteMissionStoreState().removeMission(missionId);
  return true;
}

// Pure — derives the snapshot from an already-known missions array without touching the
// timer engine or the Zustand store. Callers that already have fresh `missions` (e.g. a
// React hook subscribed to the store) should use this instead of
// buildThreeMinuteMissionSnapshot() during render: that function's engine sync can write
// to the store, and doing that inside a render-phase useMemo/useState trips React's
// "Cannot update a component while rendering a different component" warning.
export function buildThreeMinuteMissionSnapshotFromMissions(
  activeMissions: readonly ThreeMinuteMission[],
): ThreeMinuteMissionSnapshot {
  const breachCount = activeMissions.filter((mission) => mission.phase === 'breach').length;
  const unacknowledgedCount = activeMissions.filter((mission) => !mission.acknowledgedAt).length;
  const store = useEmergencyStore.getState();
  const criticalAlerts = store.alerts.filter(
    (alert) => alert.severity === 'Critical' && !alert.dismissed,
  );
  const compliant = criticalAlerts.filter((alert) => {
    if (!alert.acknowledgedAt) return false;
    return (
      new Date(alert.acknowledgedAt).getTime() - new Date(alert.createdAt).getTime() <=
      THREE_MINUTE_MISSION_TARGET_SECONDS * 1000
    );
  }).length;
  const complianceRate = criticalAlerts.length
    ? Math.round((compliant / criticalAlerts.length) * 100)
    : 100;

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    principle: THREE_MINUTE_MISSION_PRINCIPLE,
    targetSeconds: THREE_MINUTE_MISSION_TARGET_SECONDS,
    activeMissions,
    breachCount,
    unacknowledgedCount,
    complianceRate,
  });
}

export function buildThreeMinuteMissionSnapshot(): ThreeMinuteMissionSnapshot {
  const activeMissions = syncThreeMinuteMissionsFromEngine();
  return buildThreeMinuteMissionSnapshotFromMissions(activeMissions);
}

export function hydrateThreeMinuteMissionsFromStore(): void {
  const persisted = getThreeMinuteMissionStoreState().missions;
  for (const mission of persisted) {
    if (mission.acknowledgedAt) continue;
    const subjectId = mission.patientId ?? (mission.emsArrivalId ? emsPreArrivalSubjectId(mission.emsArrivalId) : null);
    if (!subjectId) continue;
    if (!getActiveTimerForPatient(subjectId)) {
      startResponseTimer(subjectId, mission.triggerAlertId, mission.ownerRole);
    }
  }
  syncThreeMinuteMissionsFromEngine();
}

export function evaluateThreeMinuteTriggers(): void {
  const store = useEmergencyStore.getState();

  for (const alert of store.alerts) {
    if (!shouldStartMissionForAlert(alert) || !alert.patientId) continue;
    if (getActiveTimerForPatient(alert.patientId)) continue;
    startThreeMinuteMission({
      trigger: 'critical_alert',
      subjectId: alert.patientId,
      patientId: alert.patientId,
      triggerAlertId: alert.id,
    });
  }

  for (const arrival of store.emsArrivals) {
    if (!shouldStartMissionForEmsArrival(arrival)) continue;
    const subjectId = emsPreArrivalSubjectId(arrival.id);
    if (getActiveTimerForPatient(subjectId)) continue;
    const alertId = `ems-prearrival-${arrival.id}`;
    startThreeMinuteMission({
      trigger: 'ems_pre_arrival',
      subjectId,
      emsArrivalId: arrival.id,
      triggerAlertId: alertId,
      subjectLabel: resolveSubjectLabel(undefined, arrival.id),
      ownerRole: 'charge_nurse',
    });
  }

  for (const patient of store.patients) {
    if (!shouldStartMissionForPatient(patient)) continue;
    if (getActiveTimerForPatient(patient.id)) continue;
    const alert =
      store.alerts.find(
        (entry) => entry.patientId === patient.id && entry.severity === 'Critical' && !entry.dismissed,
      ) ?? ({ id: `critical-patient-${patient.id}` } as Alert);
    startThreeMinuteMission({
      trigger: patient.flags?.includes(PatientFlag.ReassessmentDue) ? 'reassessment_breach' : 'critical_patient',
      subjectId: patient.id,
      patientId: patient.id,
      triggerAlertId: alert.id,
    });
  }

  syncThreeMinuteMissionsFromEngine();
}

export default {
  startThreeMinuteMission,
  acknowledgeThreeMinuteMission,
  buildThreeMinuteMissionSnapshot,
  buildThreeMinuteMissionSnapshotFromMissions,
  syncThreeMinuteMissionsFromEngine,
  evaluateThreeMinuteTriggers,
  hydrateThreeMinuteMissionsFromStore,
};