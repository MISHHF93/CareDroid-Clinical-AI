/**
 * Provider-waiting status for a single patient — split out of
 * waitingRoomSafetyBoardModel.ts (Cycle 268) to break a real circular
 * dependency with whatHappensNextGuidance.ts: that file only ever needed
 * this one function, which itself only depends on PatientState/Patient/Staff
 * from types/emergency.ts, nothing else in its original home.
 */
import { PatientState, type Patient, type Staff } from '../types/emergency';

export type ProviderWaitingStatusTone = 'neutral' | 'info' | 'warning' | 'critical';

export function deriveProviderWaitingStatus(
  patient: Patient,
  staff: Staff[] = [],
): { label: string; tone: ProviderWaitingStatusTone } {
  if (patient.state === PatientState.Assessment) {
    return { label: 'With provider', tone: 'info' };
  }

  if (patient.state !== PatientState.Waiting) {
    return { label: 'Not in waiting room', tone: 'neutral' };
  }

  const assignee = staff.find((member) => member.id === patient.assignedStaffId);
  const assigneeName = assignee?.displayName || assignee?.name || patient.assignedTo;

  if (!patient.assignedStaffId) {
    return { label: 'Awaiting provider', tone: 'warning' };
  }

  if (!patient.lastAssessedTime) {
    return {
      label: assigneeName ? `Assigned · ${assigneeName}` : 'Assigned · not seen',
      tone: 'warning',
    };
  }

  return {
    label: assigneeName ? `Return · ${assigneeName}` : 'Return · awaiting provider',
    tone: 'info',
  };
}
