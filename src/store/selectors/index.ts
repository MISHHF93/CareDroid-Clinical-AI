/**
 * CareDroid Canonical Selectors
 *
 * These selectors provide the single source of truth for all derived state.
 * Components should use these selectors instead of computing counts locally.
 *
 * The backend is authoritative for persisted clinical and operational state.
 * These selectors derive frontend-only presentation state from the canonical store.
 *
 * Strategy:
 * - Use pre-computed values from state.capacity when available (the store computes these on every set())
 * - Fall back to computing from patients array for values not in capacity
 * - This eliminates duplicate derivations in components and hooks
 */

import type { Patient, Alert, CapacitySnapshot } from '../../types/emergency';
import { PatientState, PatientFlag } from '../../types/emergency';

// ============================================================================
// Patient Selectors (computed from source of truth)
// ============================================================================

/** All patients currently in the system */
export const selectAllPatients = (state: { patients: Patient[] }) => state.patients;

/** Total active patient count (excludes discharged and deceased) */
export const selectActivePatientCount = (state: { patients: Patient[] }) =>
  state.patients.filter(
    (p) => p.state !== PatientState.Discharge && p.state !== PatientState.Deceased
  ).length;

/** Patients currently waiting (in Waiting state) */
export const selectWaitingPatients = (state: { patients: Patient[] }) =>
  state.patients.filter((p) => p.state === PatientState.Waiting);

/** Count of patients waiting (uses pre-computed capacity.waitingCount if available) */
export const selectWaitingCount = (state: {
  patients: Patient[];
  capacity?: CapacitySnapshot;
}) =>
  state.capacity?.waitingCount ?? selectWaitingPatients(state).length;

/** Patients in triage */
export const selectInTriagePatients = (state: { patients: Patient[] }) =>
  state.patients.filter((p) => p.state === PatientState.Triage);

/** Patients in assessment or orders or results */
export const selectInAssessmentPatients = (state: { patients: Patient[] }) =>
  state.patients.filter(
    (p) =>
      p.state === PatientState.Assessment ||
      p.state === PatientState.Orders ||
      p.state === PatientState.Results
  );

/** Patients pending disposition (admit decision) */
export const selectPendingDispositionPatients = (state: { patients: Patient[] }) =>
  state.patients.filter((p) => p.state === PatientState.Disposition);

/** Patients admitted (boarding) */
export const selectBoardingPatients = (state: { patients: Patient[] }) =>
  state.patients.filter((p) => p.state === PatientState.Admission);

/** Count of boarding patients (uses pre-computed capacity.boardingCount if available) */
export const selectBoardingCount = (state: {
  patients: Patient[];
  capacity?: CapacitySnapshot;
}) =>
  state.capacity?.boardingCount ?? selectBoardingPatients(state).length;

/** Patients with reassessment due (uses pre-computed capacity.reassessmentDue if available) */
export const selectReassessmentDueCount = (state: {
  patients: Patient[];
  capacity?: CapacitySnapshot;
}) => state.capacity?.reassessmentDue ?? selectReassessmentDueCountFromPatients(state);

function selectReassessmentDueCountFromPatients(state: { patients: Patient[] }) {
  return state.patients.filter((p) =>
    p.flags?.some((f) => f === PatientFlag.ReassessmentDue)
  ).length;
}

/** Patients flagged as LWBS risk */
export const selectLwbsRiskCount = (state: { patients: Patient[] }) =>
  state.patients.filter((p) =>
    p.flags?.some((f) => f === PatientFlag.LWBSRisk)
  ).length;

// ============================================================================
// Alert Selectors
// ============================================================================

/** All active alerts (not dismissed) */
export const selectActiveAlerts = (state: { alerts: Alert[] }) =>
  state.alerts.filter((a) => !a.dismissed);

/** Count of active alerts */
export const selectActiveAlertCount = (state: { alerts: Alert[] }) =>
  selectActiveAlerts(state).length;

/** Critical alerts */
export const selectCriticalAlerts = (state: { alerts: Alert[] }) =>
  state.alerts.filter((a) => a.severity === 'Critical' && !a.dismissed);

/** Count of critical alerts */
export const selectCriticalAlertCount = (state: { alerts: Alert[] }) =>
  selectCriticalAlerts(state).length;

/** High severity alerts (Warning) */
export const selectHighAlerts = (state: { alerts: Alert[] }) =>
  state.alerts.filter((a) => a.severity === 'Warning' && !a.dismissed);

// ============================================================================
// Capacity Selectors (use pre-computed values from store)
// ============================================================================

/** Current capacity snapshot */
export const selectCapacity = (state: { capacity: CapacitySnapshot }) => state.capacity;

/** Occupancy percentage */
export const selectOccupancyPercent = (state: { capacity: CapacitySnapshot }) =>
  state.capacity.occupancyPercent;

/** Capacity band (Normal, High, Critical, etc.) */
export const selectCapacityBand = (state: { capacity: CapacitySnapshot }) =>
  state.capacity.band;

/** Capacity score (0-100) */
export const selectCapacityScore = (state: { capacity: CapacitySnapshot }) =>
  state.capacity.score;

// ============================================================================
// Composite Selectors (derived from multiple slices)
// ============================================================================

/**
 * Emergency Department Summary
 * Combines multiple state slices into a single summary object.
 * This is the canonical source for dashboard summaries.
 */
export const selectEdSummary = (state: {
  patients: Patient[];
  alerts: Alert[];
  capacity: CapacitySnapshot;
}) => ({
  totalPatients: state.capacity.totalPatients ?? state.patients.length,
  activePatients: selectActivePatientCount(state),
  waitingCount: selectWaitingCount(state),
  inTriageCount: selectInTriagePatients(state).length,
  inAssessmentCount: selectInAssessmentPatients(state).length,
  boardingCount: selectBoardingCount(state),
  reassessmentDueCount: selectReassessmentDueCount(state),
  lwbsRiskCount: selectLwbsRiskCount(state),
  activeAlertCount: selectActiveAlertCount(state),
  criticalAlertCount: selectCriticalAlertCount(state),
  occupancyPercent: state.capacity.occupancyPercent,
  capacityBand: state.capacity.band,
  incomingEMSCritical: state.capacity.incomingEMSCriticalCount ?? 0,
});

/**
 * Screen Mode KPIs
 * Returns KPI values appropriate for the current screen mode.
 * Uses the canonical selectors to ensure consistency across the UI.
 */
export const selectScreenModeKpis = (
  state: {
    patients: Patient[];
    alerts: Alert[];
    capacity: CapacitySnapshot;
  },
  screenMode: string
) => {
  const summary = selectEdSummary(state);

  switch (screenMode) {
    case 'triage':
      return {
        patientCount: summary.activePatients,
        waitingCount: summary.waitingCount,
        inTriageCount: summary.inTriageCount,
        alertCount: summary.activeAlertCount,
        capacityBand: summary.capacityBand,
      };
    case 'chargeNurse':
      return {
        patientCount: summary.activePatients,
        boardingCount: summary.boardingCount,
        reassessmentDueCount: summary.reassessmentDueCount,
        alertCount: summary.criticalAlertCount,
        capacityBand: summary.capacityBand,
      };
    case 'physician':
      return {
        patientCount: summary.activePatients,
        inAssessmentCount: summary.inAssessmentCount,
        alertCount: summary.activeAlertCount,
      };
    case 'ems':
      return {
        patientCount: summary.activePatients,
        incomingEMSCritical: summary.incomingEMSCritical,
        alertCount: summary.activeAlertCount,
      };
    case 'commandCenter':
      return summary;
    default:
      return {
        patientCount: summary.activePatients,
        waitingCount: summary.waitingCount,
        alertCount: summary.activeAlertCount,
      };
  }
};
