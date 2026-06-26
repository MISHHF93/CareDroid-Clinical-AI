import { PatientFlag, PatientState } from '../../types/emergency';
import { buildWaitingPatientReassessmentTimers } from '../../engine/reassessmentTimerEngine';

/** Existing reassessment surfaces in the product (drawer, header badge, cards, palette, etc.). */
export const REASSESSMENT_WORKFLOW_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'notification-center',
    label: 'Header notification center',
    surfaces: ['Header'],
    mechanism: 'reassessment-timer-alerts',
  }),
  Object.freeze({
    id: 'waiting-room-safety-board',
    label: 'Waiting room safety board',
    surfaces: ['WaitingRoomSafetyBoard', 'ReassessmentTimerStrip'],
    mechanism: 'timer-snapshot',
  }),
  Object.freeze({
    id: 'patient-detail',
    label: 'Patient detail reassessment panel',
    surfaces: ['PatientDetailPanel', 'ReassessmentTimerPanel'],
    mechanism: 'timer-snapshot',
  }),
  Object.freeze({
    id: 'whiteboard-card',
    label: 'Whiteboard patient card timer strip',
    surfaces: ['PatientCard', 'ReassessmentTimerStrip'],
    mechanism: 'timer-snapshot',
  }),
  Object.freeze({
    id: 'drawer',
    label: 'Reassessment drawer',
    surfaces: ['AppShell', 'ReassessmentDrawer'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'header-badge',
    label: 'Header attention badge',
    surfaces: ['Header'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'patient-card',
    label: 'Patient card pulse + Reassess action',
    surfaces: ['PatientCard'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'command-palette',
    label: 'Command palette reassessment',
    surfaces: ['CommandPalette'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'whiteboard-mission',
    label: 'Whiteboard mission control tasks',
    surfaces: ['emergency/index'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'charge-strip',
    label: 'Charge nurse operational strip',
    surfaces: ['ChargeNurseOperationalStrip'],
    mechanism: 'open-reassessment',
  }),
  Object.freeze({
    id: 'who-next',
    label: 'See next patient scoring',
    surfaces: ['WhoNextPanel'],
    mechanism: 'selectPatient',
  }),
  Object.freeze({
    id: 'capacity-crisis',
    label: 'Capacity crisis reassessment CTA',
    surfaces: ['CapacityCrisisMode'],
    mechanism: 'open-reassessment-drawer',
  }),
]);

export const REASSESSMENT_ATTENTION_FLAGS = Object.freeze([
  PatientFlag.ReassessmentDue,
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
  PatientFlag.ScoreReassessmentRecommended,
]);

const CRITICAL_REASSESSMENT_FLAGS = new Set([
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
]);

function normalizeFlagType(flag) {
  if (typeof flag === 'string') return flag;
  if (flag && typeof flag === 'object' && typeof flag.type === 'string') return flag.type;
  return null;
}

export function patientMatchesReassessmentAttention(patient) {
  if (!patient) return false;
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Deceased) return false;
  return (patient.flags ?? []).some((flag) =>
    REASSESSMENT_ATTENTION_FLAGS.includes(normalizeFlagType(flag)),
  );
}

export function countReassessmentAttentionPatients(patients = [] as any[]) {
  return patients.filter(patientMatchesReassessmentAttention).length;
}

export function countCriticalReassessmentPatients(patients = [] as any[]) {
  return patients.filter((patient) =>
    (patient.flags ?? []).some((flag) => CRITICAL_REASSESSMENT_FLAGS.has(normalizeFlagType(flag))),
  ).length;
}

export function shouldShowReassessmentAttentionStrip({ displayMode = false, attentionCount = 0 }: any = {}) {
  return !displayMode && attentionCount > 0;
}

export function buildReassessmentAttentionStripMetrics(patients = [] as any[]) {
  const attentionCount = countReassessmentAttentionPatients(patients);
  if (!attentionCount) return [];

  const criticalCount = countCriticalReassessmentPatients(patients);
  const metrics = [
    Object.freeze({
      id: 'reassessment-open',
      label: attentionCount === 1 ? 'Patient needs reassessment' : 'Patients need reassessment',
      hint: 'Open reassessment drawer and review flagged patients',
      value: attentionCount,
      surface: 'reassessments',
      tone: criticalCount > 0 ? 'critical' : 'warning',
      whiteboardAction: 'open-reassessment',
    }),
    Object.freeze({
      id: 'reassessment-filter',
      label: 'Show on board',
      hint: 'Filter the whiteboard to reassessment patients',
      value: attentionCount,
      surface: 'reassessments',
      tone: 'warning',
      whiteboardAction: 'filter-reassess',
    }),
  ];

  if (criticalCount > 0) {
    (metrics as any[]).push(
      Object.freeze({
        id: 'reassessment-critical',
        label: 'Critical reassessment flags',
        hint: 'Deterioration, sepsis, or high-risk flags are active',
        value: criticalCount,
        surface: 'reassessments',
        tone: 'critical',
        whiteboardAction: 'filter-reassess',
      }),
    );
  }

  const overdueTimers = buildWaitingPatientReassessmentTimers(patients).filter((timer) => timer.isOverdue);
  if (overdueTimers.length > 0) {
    (metrics as any[]).unshift(
      Object.freeze({
        id: 'reassessment-timer-overdue',
        label: 'Reassessment timers overdue',
        hint: 'Waiting-room patients past reassessment due time',
        value: overdueTimers.length,
        surface: 'reassessments',
        tone: 'critical',
        whiteboardAction: 'open-reassessment',
      }),
    );
  }

  return metrics;
}
