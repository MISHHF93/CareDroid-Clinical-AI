import { PatientState } from '../../types/emergency';
import { emergencyRoleForStaff } from './emergencyRolePermissions';

const ACTIVE_PATIENT_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

export function staffDisplayName(staff) {
  if (!staff) return 'Unassigned';
  return `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.id;
}

export function staffInitials(staff) {
  if (!staff) return 'NA';
  return `${staff.firstName?.[0] || ''}${staff.lastName?.[0] || ''}`.toUpperCase() || 'NA';
}

export function staffRoleLabel(role) {
  const normalized = emergencyRoleForStaff({ role });
  if (['MD', 'RN', 'PA', 'Tech', 'Admin'].includes(normalized)) return normalized;
  if (role === 'Attending' || role === 'Consultant') return 'MD';
  if (role === 'TriageNurse' || role === 'ChargeNurse') return 'RN';
  if (role === 'Technician' || role === 'Paramedic') return 'Tech';
  return role || 'Staff';
}

export function workloadTone(assignedCount) {
  if (assignedCount === 0) return 'gray';
  if (assignedCount >= 6) return 'red';
  if (assignedCount >= 4) return 'yellow';
  return 'green';
}

export function onShiftStaff(staff = [], activeShift = null) {
  const shiftStaffIds = new Set(activeShift?.staffIds || []);
  return staff.filter(
    (member) =>
      member.status === 'OnShift' && (!shiftStaffIds.size || shiftStaffIds.has(member.id))
  );
}

export function buildStaffWorkloads(staff = [], patients = [], activeShift = null) {
  const activePatients = patients.filter((patient) => ACTIVE_PATIENT_STATES.has(patient.state));
  const counts = activePatients.reduce((current, patient) => {
    if (!patient.assignedStaffId) return current;
    current.set(patient.assignedStaffId, (current.get(patient.assignedStaffId) || 0) + 1);
    return current;
  }, new Map());

  return onShiftStaff(staff, activeShift).map((member) => {
    const assignedPatients = activePatients.filter((patient) => patient.assignedStaffId === member.id);
    const assignedCount = counts.get(member.id) || 0;
    return {
      ...member,
      displayName: staffDisplayName(member),
      initials: staffInitials(member),
      roleLabel: staffRoleLabel(member.role),
      assignedCount,
      assignedPatients,
      workloadTone: workloadTone(assignedCount),
      workloadPercent: Math.min(100, Math.round((assignedCount / 6) * 100)),
    };
  });
}

export function getStaffRebalanceSuggestion(workloads = []) {
  if (!workloads.length) return null;

  const total = workloads.reduce((sum, member) => sum + member.assignedCount, 0);
  const average = total / workloads.length;
  if (average <= 0) return null;

  const busiest = [...workloads].sort((a, b) => b.assignedCount - a.assignedCount)[0];
  const hasCapacityReceiver = workloads.some(
    (member) => member.id !== busiest?.id && member.assignedCount <= 3
  );
  const isTwoTimesAverage = busiest && busiest.assignedCount >= average * 2;
  const isOverloadedWithAvailablePeer =
    busiest && busiest.assignedCount >= 6 && hasCapacityReceiver;
  if (!busiest || (!isTwoTimesAverage && !isOverloadedWithAvailablePeer)) return null;

  return {
    staffId: busiest.id,
    name: busiest.displayName,
    assignedCount: busiest.assignedCount,
    teamAverage: Number(average.toFixed(1)),
    message: `Imbalance detected - ${busiest.displayName} has ${busiest.assignedCount} patients vs team average of ${average.toFixed(1)}`,
  };
}
