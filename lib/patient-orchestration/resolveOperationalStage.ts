import { PatientFlag, PatientState, type Patient, type Referral } from '../../src/types/emergency';
import type { EdOperationalStage } from './orchestrationTypes';

const CLOSED_REFERRAL_STATUSES = new Set(['Closed', 'Completed', 'Declined', 'PatientDeparted']);

function isOpenReferral(referral?: Referral | null): boolean {
  if (!referral) return false;
  return !CLOSED_REFERRAL_STATUSES.has(String(referral.status || '').trim());
}

function hasDeteriorationSignals(patient: Patient): boolean {
  const flags = patient.flags || [];
  return (
    flags.includes(PatientFlag.SepsisAlert) ||
    flags.includes(PatientFlag.DeteriorationRisk) ||
    flags.includes(PatientFlag.DeterioratingNeuro) ||
    flags.includes(PatientFlag.StrokeCode) ||
    (patient.vitalsAlerts?.length ?? 0) > 0
  );
}

export function resolveOperationalStage(
  patient: Patient,
  referral?: Referral | null,
): { primary: EdOperationalStage; overlays: EdOperationalStage[] } {
  const overlays = new Set<EdOperationalStage>();
  const state = patient.state;
  const flags = patient.flags || [];

  if (hasDeteriorationSignals(patient)) {
    overlays.add('deterioration_concern');
  }

  if (
    flags.includes(PatientFlag.ReassessmentDue) ||
    flags.includes(PatientFlag.ScoreReassessmentRecommended)
  ) {
    overlays.add('observation_reassessment');
  }

  if (isOpenReferral(referral) || flags.includes(PatientFlag.PendingAdmission)) {
    overlays.add('referral_boarding_transfer');
  }

  let primary: EdOperationalStage;

  if (state === PatientState.Arrival || state === PatientState.Registration) {
    primary = 'arrival';
  } else if (
    state === PatientState.Waiting &&
    (patient.triagePending || patient.registrationStatus !== 'complete')
  ) {
    primary = 'waiting_intake';
  } else if (state === PatientState.Triage || patient.triagePending) {
    primary = 'triage_handoff';
  } else if (state === PatientState.Assessment || state === PatientState.Orders) {
    primary = 'physician_assessment';
  } else if (state === PatientState.Results) {
    primary = 'results_review';
  } else if (state === PatientState.Waiting) {
    primary = overlays.has('observation_reassessment')
      ? 'observation_reassessment'
      : 'waiting_intake';
  } else if (state === PatientState.Admission || state === PatientState.Disposition) {
    primary = overlays.has('referral_boarding_transfer')
      ? 'referral_boarding_transfer'
      : 'discharge_workflow';
  } else if (state === PatientState.Discharge) {
    primary = 'discharge_workflow';
  } else {
    primary = 'physician_assessment';
  }

  if (primary === 'physician_assessment' && overlays.has('deterioration_concern')) {
    overlays.add('observation_reassessment');
  }

  return { primary, overlays: [...overlays] };
}