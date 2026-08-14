import type { Patient, Staff } from '../types/emergency';

/**
 * Shared by the clinical (PatientRoomWhiteboard) and plain-language
 * (PatientWhiteboard) bedside patient displays -- previously duplicated
 * byte-for-byte in patientRoomWhiteboardModel.ts and patientWhiteboardModel.ts.
 */
export function waitMinutes(arrivalTime: string): number {
  const parsed = new Date(arrivalTime).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

/**
 * Assigned nurse/staff + physician display names, deduped, in no particular
 * priority order beyond staff-then-physician. Returns the raw (possibly
 * empty) list -- each caller applies its own fallback copy when empty, since
 * the clinical and plain-language displays word that fallback differently.
 */
export function resolveAssignedCareTeamNames(patient: Patient, staff: Staff[]): string[] {
  const names: string[] = [];
  if (patient.assignedStaffId) {
    const assigned = staff.find((entry) => entry.id === patient.assignedStaffId);
    if (assigned?.name) names.push(assigned.name);
  }
  if (patient.assignedPhysicianId) {
    const physician = staff.find((entry) => entry.id === patient.assignedPhysicianId);
    if (physician?.name && !names.includes(physician.name)) names.push(physician.name);
  }
  return names;
}
