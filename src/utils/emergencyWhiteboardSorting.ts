import { PatientState, type Patient } from '../types/emergency';
import { normalizePatientArrival } from '../services/patientArrivalModel';

export function whiteboardArrivalTimestamp(patient: Pick<Patient, 'arrivalTime' | 'arrival'>): string {
  return patient.arrival?.arrivalTimestamp || patient.arrivalTime;
}

export function whiteboardAcuityLevel(patient: Patient): number {
  const arrival = normalizePatientArrival(patient);
  return arrival.triageAcuity.level;
}

export function waitMinutesForWhiteboard(
  patient: Pick<Patient, 'arrivalTime' | 'arrival'>,
  now = Date.now(),
): number {
  const arrivedAt = new Date(whiteboardArrivalTimestamp(patient)).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((now - arrivedAt) / 60000));
}

export function sortWhiteboardPatients(a: Patient, b: Patient, now = Date.now()): number {
  const aWaiting = a.state === PatientState.Waiting;
  const bWaiting = b.state === PatientState.Waiting;

  if (aWaiting && bWaiting) {
    return waitMinutesForWhiteboard(b, now) - waitMinutesForWhiteboard(a, now);
  }

  const priorityDelta = whiteboardAcuityLevel(a) - whiteboardAcuityLevel(b);
  if (priorityDelta !== 0) return priorityDelta;
  return waitMinutesForWhiteboard(b, now) - waitMinutesForWhiteboard(a, now);
}