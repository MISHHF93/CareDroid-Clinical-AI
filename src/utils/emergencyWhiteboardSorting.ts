import { PatientState, Priority, type Patient } from '../types/emergency';

const PRIORITY_RANK: Record<Priority, number> = {
  [Priority.P1]: 1,
  [Priority.P2]: 2,
  [Priority.P3]: 3,
  [Priority.P4]: 4,
  [Priority.P5]: 5,
};

export function waitMinutesForWhiteboard(patient: Pick<Patient, 'arrivalTime'>, now = Date.now()): number {
  const arrivedAt = new Date(patient.arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((now - arrivedAt) / 60000));
}

export function sortWhiteboardPatients(a: Patient, b: Patient, now = Date.now()): number {
  const aWaiting = a.state === PatientState.Waiting;
  const bWaiting = b.state === PatientState.Waiting;

  if (aWaiting && bWaiting) {
    return waitMinutesForWhiteboard(b, now) - waitMinutesForWhiteboard(a, now);
  }

  const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priorityDelta !== 0) return priorityDelta;
  return waitMinutesForWhiteboard(b, now) - waitMinutesForWhiteboard(a, now);
}
