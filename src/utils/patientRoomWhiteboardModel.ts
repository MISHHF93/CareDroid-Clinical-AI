import { predictPatientJourney } from '../engine/patientJourneyPrediction';
import { selectReassessmentTimerForPatient } from '../engine/reassessmentTimerEngine';
import { PatientFlag, PatientState, type Patient, type Staff } from '../types/emergency';
import { deriveWhiteboardOperationalEvents } from './whiteboardOperationalEvents';
import { patientFriendlyStateLabel, toPatientFriendlyTerm } from './patientFriendlyTerminology';
import { resolveAssignedCareTeamNames, waitMinutes } from './patientWhiteboardSharedModel';

export type PatientRoomWhiteboardSnapshot = {
  patientName: string;
  careTeam: string[];
  statusLabel: string;
  waitMinutes: number;
  nextSteps: string[];
  dischargeInstructions: string[];
  reassuranceMessage: string;
  updatedAt: string;
};

function careTeamNames(patient: Patient, staff: Staff[]): string[] {
  const names = resolveAssignedCareTeamNames(patient, staff);
  return names.length ? names : ['Your emergency care team'];
}

export function buildPatientRoomWhiteboardSnapshot(
  patient: Patient,
  staff: Staff[] = [],
): PatientRoomWhiteboardSnapshot {
  const events = deriveWhiteboardOperationalEvents(patient);
  const prediction = predictPatientJourney({ patient });
  const reassessment = selectReassessmentTimerForPatient(patient);
  const nextSteps: string[] = [];

  if (patient.state === PatientState.Triage || patient.triagePending) {
    nextSteps.push('A triage nurse will assess you shortly');
  }
  if (patient.state === PatientState.Waiting) {
    nextSteps.push('A doctor or advanced practice provider will see you when ready');
  }
  if (patient.state === PatientState.Results) {
    nextSteps.push('Your care team is reviewing your test results');
  }
  if (prediction.thresholdBreached) {
    nextSteps.push('Your team is preparing in case you need a hospital bed');
  }
  if (reassessment && (reassessment.stage === 'due' || reassessment.isOverdue)) {
    nextSteps.push('A nurse will check on you again soon');
  }
  events.forEach((event) => {
    if (event.id === 'results-pending') nextSteps.push('Waiting for test results');
    if (event.id === 'awaiting-consult') nextSteps.push('A specialist is being consulted');
    if (event.id === 'boarding') nextSteps.push('Arranging your inpatient bed');
  });
  if (!nextSteps.length) {
    nextSteps.push('Your care team is actively managing your treatment');
  }

  const dischargeInstructions: string[] = [];
  if (patient.state === PatientState.Discharge || patient.state === PatientState.Disposition) {
    dischargeInstructions.push('Follow the instructions given by your care team');
    dischargeInstructions.push('Return if symptoms worsen or you have new concerns');
  }
  if (patient.flags.includes(PatientFlag.Isolation)) {
    dischargeInstructions.push(toPatientFriendlyTerm('Isolation precautions may apply'));
  }

  return {
    patientName: `${patient.firstName} ${patient.lastName}`.trim(),
    careTeam: careTeamNames(patient, staff),
    statusLabel: patientFriendlyStateLabel(patient.state),
    waitMinutes: waitMinutes(patient.triageTime || patient.arrivalTime),
    nextSteps: [...new Set(nextSteps)].slice(0, 4),
    dischargeInstructions,
    reassuranceMessage:
      'Information updates automatically. Ask any team member if you have questions.',
    updatedAt: new Date().toISOString(),
  };
}