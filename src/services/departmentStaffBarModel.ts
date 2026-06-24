import {
  PatientState,
  type ActiveShift,
  type Patient,
  type Room,
  type Staff,
  type StaffRole,
  type StaffStatus,
} from '../types/emergency';

const inactiveStatuses = new Set(['OffShift', 'Unavailable']);

function isOnDutyStaff(member: Staff): boolean {
  return member.active !== false && !inactiveStatuses.has(String(member.status || ''));
}

export type DepartmentStaffBarEntry = Readonly<{
  staffId: string;
  name: string;
  title: string;
  role: StaffRole;
  responsibilities: readonly string[];
  patientCount: number;
  isCharge: boolean;
  status: StaffStatus;
  sortOrder: number;
}>;

export type DepartmentStaffBarSnapshot = Readonly<{
  shiftLabel: string;
  onDutyCount: number;
  entries: readonly DepartmentStaffBarEntry[];
}>;

const ROLE_TITLES: Partial<Record<StaffRole, string>> = {
  Charge: 'Charge Nurse',
  ChargeNurse: 'Charge Nurse',
  TriageNurse: 'Triage Nurse',
  MD: 'Attending Physician',
  Attending: 'Attending Physician',
  Resident: 'Resident Physician',
  PA: 'Physician Assistant',
  RN: 'Staff Nurse',
  Nurse: 'Staff Nurse',
  Tech: 'ED Technician',
  Technician: 'ED Technician',
  Clerk: 'Registration Clerk',
  Paramedic: 'Paramedic',
  Consultant: 'Consultant',
  Administrator: 'Administrator',
};

const ROLE_SORT_ORDER: Partial<Record<StaffRole, number>> = {
  Charge: 0,
  ChargeNurse: 0,
  TriageNurse: 1,
  MD: 2,
  Attending: 2,
  Resident: 3,
  PA: 4,
  RN: 5,
  Nurse: 5,
  Tech: 6,
  Technician: 6,
  Clerk: 7,
  Paramedic: 8,
  Consultant: 9,
  Administrator: 10,
};

const ACTIVE_PATIENT_STATES = new Set<PatientState>([
  PatientState.Arrival,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
]);

function staffDisplayName(member: Staff): string {
  return (
    member.displayName ||
    member.name ||
    [member.firstName, member.lastName].filter(Boolean).join(' ') ||
    member.id
  );
}

function staffTitle(member: Staff): string {
  return member.roleLabel || ROLE_TITLES[member.role] || member.role;
}

function sortOrderFor(member: Staff, isCharge: boolean): number {
  if (isCharge) return -1;
  return ROLE_SORT_ORDER[member.role] ?? 20;
}

function activePatientsForStaff(member: Staff, patients: Patient[]): Patient[] {
  const assignedIds = new Set(member.assignedPatientIds || []);
  return patients.filter((patient) => {
    if (!ACTIVE_PATIENT_STATES.has(patient.state)) return false;
    return patient.assignedStaffId === member.id || assignedIds.has(patient.id);
  });
}

function triagePatientsForStaff(member: Staff, patients: Patient[]): Patient[] {
  return activePatientsForStaff(member, patients).filter(
    (patient) => patient.state === PatientState.Triage || patient.state === PatientState.Arrival,
  );
}

function resusPatientsForStaff(
  member: Staff,
  patients: Patient[],
  roomsById: Map<string, Room>,
): Patient[] {
  return activePatientsForStaff(member, patients).filter((patient) => {
    if (!patient.roomId) return false;
    const room = roomsById.get(patient.roomId);
    return room?.type === 'Resus' || room?.type === 'Resuscitation';
  });
}

function buildResponsibilities(
  member: Staff,
  patients: Patient[],
  roomsById: Map<string, Room>,
  isCharge: boolean,
): string[] {
  const responsibilities: string[] = [];
  const assignedPatients = activePatientsForStaff(member, patients);
  const triagePatients = triagePatientsForStaff(member, patients);
  const resusPatients = resusPatientsForStaff(member, patients, roomsById);

  if (isCharge) {
    responsibilities.push('Department flow & surge coordination');
  }

  if (member.role === 'TriageNurse' || triagePatients.length > 0) {
    responsibilities.push(
      triagePatients.length > 0
        ? `Triage queue (${triagePatients.length} patient${triagePatients.length === 1 ? '' : 's'})`
        : 'Front-door triage lane',
    );
  }

  if (resusPatients.length > 0) {
    responsibilities.push(
      `Resuscitation coverage (${resusPatients.length} patient${resusPatients.length === 1 ? '' : 's'})`,
    );
  }

  if (assignedPatients.length > 0) {
    responsibilities.push(
      `${assignedPatients.length} active patient${assignedPatients.length === 1 ? '' : 's'}`,
    );
  } else if (!isCharge && member.role !== 'TriageNurse' && member.role !== 'Clerk') {
    responsibilities.push('On-call / float coverage');
  }

  if (member.currentRoomId) {
    const room = roomsById.get(member.currentRoomId);
    if (room?.name) {
      responsibilities.push(`Station: ${room.name}`);
    }
  }

  if (!responsibilities.length) {
    responsibilities.push('On-duty — available for assignment');
  }

  return responsibilities;
}

function resolveOnDutyStaff(staff: Staff[], activeShift?: ActiveShift | null): Staff[] {
  const shiftStaffIds = activeShift?.staffIds?.filter(Boolean) || [];
  if (shiftStaffIds.length) {
    const byId = new Map(staff.map((member) => [member.id, member]));
    return shiftStaffIds
      .map((staffId) => byId.get(staffId))
      .filter((member): member is Staff => Boolean(member))
      .filter(isOnDutyStaff);
  }

  return staff.filter(isOnDutyStaff);
}

export function buildDepartmentStaffBarSnapshot(input: {
  staff: Staff[];
  patients: Patient[];
  rooms?: Room[];
  activeShift?: ActiveShift | null;
}): DepartmentStaffBarSnapshot {
  const roomsById = new Map((input.rooms || []).map((room) => [room.id, room]));
  const chargeStaffId = input.activeShift?.chargeStaffId;
  const onDutyStaff = resolveOnDutyStaff(input.staff, input.activeShift);

  const entries = onDutyStaff
    .map((member) => {
      const isCharge = Boolean(chargeStaffId && member.id === chargeStaffId);
      const assignedPatients = activePatientsForStaff(member, input.patients);
      return {
        staffId: member.id,
        name: staffDisplayName(member),
        title: staffTitle(member),
        role: member.role,
        responsibilities: buildResponsibilities(member, input.patients, roomsById, isCharge),
        patientCount: assignedPatients.length,
        isCharge,
        status: (member.status || 'OnShift') as StaffStatus,
        sortOrder: sortOrderFor(member, isCharge),
      };
    })
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.name.localeCompare(right.name);
    });

  return {
    shiftLabel: input.activeShift?.label || 'Current ED shift',
    onDutyCount: entries.length,
    entries,
  };
}