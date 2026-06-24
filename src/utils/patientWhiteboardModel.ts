import { PatientState, type Patient, type Staff } from '../types/emergency';
import { patientFriendlyStateLabel } from './patientFriendlyTerminology';

export type PatientWhiteboardSnapshot = {
  patientFirstName: string;
  careTeamLabel: string;
  careTeamMembers: string[];
  nextStep: string;
  estimatedWaitLabel: string;
  dischargeInstructions: string[];
  reassuranceLine: string;
  updatedAt: string;
};

function waitMinutes(arrivalTime: string): number {
  const parsed = new Date(arrivalTime).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

function formatWaitTime(minutes: number): string {
  if (minutes <= 5) return 'A short wait';
  if (minutes < 60) return `About ${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `About ${hours} hour${hours === 1 ? '' : 's'}`;
  return `About ${hours} hour${hours === 1 ? '' : 's'} and ${remainder} minutes`;
}

function resolveNextStep(patient: Patient): string {
  if (patient.state === PatientState.Triage || patient.triagePending) {
    return 'A nurse will check how you are feeling.';
  }
  if (patient.state === PatientState.Waiting) {
    return 'You will see a doctor or nurse practitioner when one is free.';
  }
  if (patient.state === PatientState.Assessment) {
    return 'Your care team is talking with you and making a plan.';
  }
  if (patient.state === PatientState.Orders || patient.state === PatientState.Results) {
    return 'Your team is waiting for test results or treatments to finish.';
  }
  if (patient.state === PatientState.Admission || patient.state === PatientState.Disposition) {
    return 'Your team is getting a hospital room ready for you.';
  }
  if (patient.state === PatientState.Discharge) {
    return 'Your team is helping you get ready to go home.';
  }
  return 'Your care team is helping you right now.';
}

function resolveDischargeInstructions(patient: Patient): string[] {
  if (patient.state !== PatientState.Discharge && patient.state !== PatientState.Disposition) {
    return [];
  }
  return [
    'Take the medicines your team gave you.',
    'Follow the home care steps on your papers.',
    'Call us or come back if you feel worse.',
  ];
}

function careTeamMembers(patient: Patient, staff: Staff[]): string[] {
  const names: string[] = [];
  if (patient.assignedStaffId) {
    const nurse = staff.find((entry) => entry.id === patient.assignedStaffId);
    if (nurse?.name) names.push(nurse.name);
  }
  if (patient.assignedPhysicianId) {
    const doctor = staff.find((entry) => entry.id === patient.assignedPhysicianId);
    if (doctor?.name && !names.includes(doctor.name)) names.push(doctor.name);
  }
  return names;
}

export function buildPatientWhiteboardSnapshot(
  patient: Patient,
  staff: Staff[] = [],
): PatientWhiteboardSnapshot {
  const wait = waitMinutes(patient.triageTime || patient.arrivalTime);
  const team = careTeamMembers(patient, staff);

  return {
    patientFirstName: patient.firstName || 'friend',
    careTeamLabel: team.length ? 'Your care team' : 'Your emergency care team',
    careTeamMembers: team.length ? team : ['A nurse and doctor are assigned to help you'],
    nextStep: resolveNextStep(patient),
    estimatedWaitLabel: formatWaitTime(wait),
    dischargeInstructions: resolveDischargeInstructions(patient),
    reassuranceLine: `Right now: ${patientFriendlyStateLabel(patient.state)}`,
    updatedAt: new Date().toISOString(),
  };
}