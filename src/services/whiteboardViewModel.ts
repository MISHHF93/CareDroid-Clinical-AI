import { PatientState, type Patient, type Room, type Staff } from '../types/emergency';
import { hasPatientFlag } from '../utils/patientVitals';
import { normalizePatientArrival } from './patientArrivalModel';
import { isPreArrivalPlaceholder } from './preArrivalWorkflow';
import { resolvePatientWaitingRoomMessage } from './waitingRoomStatusMessaging';
import {
  sortWhiteboardPatients,
  waitMinutesForWhiteboard,
  whiteboardAcuityLevel,
} from '../utils/emergencyWhiteboardSorting';

export type WhiteboardQuickFilter =
  | 'all'
  | 'waiting'
  | 'assessment'
  | 'high-risk'
  | 'ems'
  | 'boarding'
  | 'reassess';

export type WhiteboardSortColumn =
  | 'triage'
  | 'patient'
  | 'wait'
  | 'reassess'
  | 'state';

export type WhiteboardSortDirection = 'asc' | 'desc';

export type WhiteboardZoneId = 'all' | 'resus' | 'treatment' | 'isolation' | 'waiting' | 'unassigned';

export type WhiteboardViewFilters = {
  quickFilter: WhiteboardQuickFilter;
  zoneId: WhiteboardZoneId;
  roomId: string;
  physicianId: string;
  sortColumn: WhiteboardSortColumn;
  sortDirection: WhiteboardSortDirection;
};

export const DEFAULT_WHITEBOARD_VIEW_FILTERS: WhiteboardViewFilters = {
  quickFilter: 'all',
  zoneId: 'all',
  roomId: 'all',
  physicianId: 'all',
  sortColumn: 'triage',
  sortDirection: 'asc',
};

export type WhiteboardZoneOption = {
  id: WhiteboardZoneId;
  label: string;
  count: number;
};

export type WhiteboardRoomOption = {
  id: string;
  label: string;
  zoneId: WhiteboardZoneId;
  count: number;
};

export type WhiteboardPhysicianOption = {
  id: string;
  label: string;
  count: number;
};

function patientName(patient: Patient): string {
  return `${patient.lastName} ${patient.firstName}`.trim().toLowerCase();
}

function reassessmentRank(patient: Patient): number {
  if (hasPatientFlag(patient, 'ReassessmentDue')) return 0;
  if (hasPatientFlag(patient, 'ScoreReassessmentRecommended')) return 1;
  return 2;
}

function zoneForRoom(room?: Room | null): WhiteboardZoneId {
  if (!room) return 'unassigned';
  if (room.type === 'Resus') return 'resus';
  if (room.type === 'Isolation') return 'isolation';
  if (room.type === 'Waiting') return 'waiting';
  return 'treatment';
}

function roomById(rooms: Room[]): Map<string, Room> {
  return new Map(rooms.map((room) => [room.id, room]));
}

export function resolvePatientZone(
  patient: Patient,
  roomsById: Map<string, Room>,
): WhiteboardZoneId {
  if (!patient.roomId) return 'unassigned';
  return zoneForRoom(roomsById.get(patient.roomId));
}

export function matchesWhiteboardQuickFilter(
  patient: Patient,
  quickFilter: WhiteboardQuickFilter,
): boolean {
  if (patient.state === PatientState.Discharge) return false;
  if (quickFilter === 'all') return true;
  if (quickFilter === 'waiting') return patient.state === PatientState.Waiting;
  if (quickFilter === 'assessment') return patient.state === PatientState.Assessment;
  if (quickFilter === 'boarding') {
    return patient.state === PatientState.Admission || hasPatientFlag(patient, 'PendingAdmission');
  }
  if (quickFilter === 'ems') {
    return (
      patient.arrival?.arrivalMode === 'EMS' ||
      hasPatientFlag(patient, 'EMSArrival') ||
      patient.source === 'EMS'
    );
  }
  if (quickFilter === 'reassess') {
    return (
      hasPatientFlag(patient, 'ReassessmentDue') ||
      hasPatientFlag(patient, 'ScoreReassessmentRecommended')
    );
  }
  if (quickFilter === 'high-risk') {
    return (
      patient.priority === 'P1' ||
      patient.priority === 'P2' ||
      hasPatientFlag(patient, 'HighRisk') ||
      hasPatientFlag(patient, 'DeteriorationRisk') ||
      hasPatientFlag(patient, 'SepsisAlert')
    );
  }
  return true;
}

export function applyWhiteboardViewFilters(
  patients: Patient[],
  rooms: Room[],
  filters: WhiteboardViewFilters,
): Patient[] {
  const roomsById = roomById(rooms);

  return patients.filter((patient) => {
    if (!matchesWhiteboardQuickFilter(patient, filters.quickFilter)) return false;

    const zone = resolvePatientZone(patient, roomsById);
    if (filters.zoneId !== 'all' && zone !== filters.zoneId) return false;

    if (filters.roomId !== 'all') {
      if (filters.roomId === 'unassigned') {
        if (patient.roomId) return false;
      } else if (patient.roomId !== filters.roomId) {
        return false;
      }
    }

    if (filters.physicianId !== 'all') {
      if (filters.physicianId === 'unassigned') {
        if (patient.assignedStaffId) return false;
      } else if (patient.assignedStaffId !== filters.physicianId) {
        return false;
      }
    }

    return true;
  });
}

export function compareWhiteboardColumn(
  a: Patient,
  b: Patient,
  column: WhiteboardSortColumn,
  direction: WhiteboardSortDirection,
  now = Date.now(),
): number {
  const sign = direction === 'asc' ? 1 : -1;

  if (column === 'triage') {
    const delta = whiteboardAcuityLevel(a) - whiteboardAcuityLevel(b);
    if (delta !== 0) return delta * sign;
    return sortWhiteboardPatients(a, b, now) * sign;
  }

  if (column === 'patient') {
    return patientName(a).localeCompare(patientName(b)) * sign;
  }

  if (column === 'wait') {
    return (waitMinutesForWhiteboard(a, now) - waitMinutesForWhiteboard(b, now)) * sign;
  }

  if (column === 'reassess') {
    return (reassessmentRank(a) - reassessmentRank(b)) * sign;
  }

  if (column === 'state') {
    return String(a.state).localeCompare(String(b.state)) * sign;
  }

  return sortWhiteboardPatients(a, b, now) * sign;
}

export function sortWhiteboardViewPatients(
  patients: Patient[],
  filters: Pick<WhiteboardViewFilters, 'sortColumn' | 'sortDirection'>,
  now = Date.now(),
): Patient[] {
  return [...patients].sort((a, b) =>
    compareWhiteboardColumn(a, b, filters.sortColumn, filters.sortDirection, now),
  );
}

export function buildWhiteboardZoneOptions(
  patients: Patient[],
  rooms: Room[],
): WhiteboardZoneOption[] {
  const roomsById = roomById(rooms);
  const counts: Record<WhiteboardZoneId, number> = {
    all: patients.length,
    resus: 0,
    treatment: 0,
    isolation: 0,
    waiting: 0,
    unassigned: 0,
  };

  for (const patient of patients) {
    const zone = resolvePatientZone(patient, roomsById);
    counts[zone] += 1;
  }

  return [
    { id: 'all', label: 'All zones', count: counts.all },
    { id: 'resus', label: 'Resus', count: counts.resus },
    { id: 'treatment', label: 'Treatment', count: counts.treatment },
    { id: 'isolation', label: 'Isolation', count: counts.isolation },
    { id: 'waiting', label: 'Waiting room', count: counts.waiting },
    { id: 'unassigned', label: 'Unassigned', count: counts.unassigned },
  ];
}

export function buildWhiteboardRoomOptions(
  patients: Patient[],
  rooms: Room[],
  zoneId: WhiteboardZoneId,
): WhiteboardRoomOption[] {
  const roomsById = roomById(rooms);
  const counts = new Map<string, number>();

  for (const patient of patients) {
    const zone = resolvePatientZone(patient, roomsById);
    if (zoneId !== 'all' && zone !== zoneId) continue;
    const key = patient.roomId || 'unassigned';
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const roomOptions = rooms
    .filter((room) => zoneId === 'all' || zoneForRoom(room) === zoneId)
    .map((room) => ({
      id: room.id,
      label: room.name,
      zoneId: zoneForRoom(room),
      count: counts.get(room.id) || 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const unassignedCount = counts.get('unassigned') || 0;

  return [
    { id: 'all', label: 'All rooms', zoneId: 'all', count: patients.length },
    ...roomOptions,
    ...(unassignedCount > 0 || zoneId === 'all' || zoneId === 'unassigned'
      ? [{ id: 'unassigned', label: 'No room', zoneId: 'unassigned' as const, count: unassignedCount }]
      : []),
  ];
}

export function buildWhiteboardPhysicianOptions(
  patients: Patient[],
  staff: Staff[],
): WhiteboardPhysicianOption[] {
  const counts = new Map<string, number>();
  let unassigned = 0;

  for (const patient of patients) {
    if (!patient.assignedStaffId) {
      unassigned += 1;
      continue;
    }
    counts.set(patient.assignedStaffId, (counts.get(patient.assignedStaffId) || 0) + 1);
  }

  const clinicians = staff
    .filter((member) => member.role === 'MD' || member.role === 'PA' || member.role === 'Charge')
    .map((member) => ({
      id: member.id,
      label: member.displayName || member.name,
      count: counts.get(member.id) || 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  return [
    { id: 'all', label: 'All physicians', count: patients.length },
    ...clinicians,
    { id: 'unassigned', label: 'Unassigned', count: unassigned },
  ];
}

export function whiteboardPatientSummary(patient: Patient): string {
  const arrival = normalizePatientArrival(patient);
  return `${arrival.triageAcuity.code} · ${arrival.chiefComplaint}`;
}

export function resolveWhiteboardStateLabel(patient: Patient): string {
  const arrival = normalizePatientArrival(patient);

  if (isPreArrivalPlaceholder(patient)) {
    const eta = patient.emsArrival?.eta;
    return eta != null ? `Inbound EMS · ${eta} min` : 'Inbound EMS';
  }

  if (patient.whiteboardAutomation?.displayState) {
    return patient.whiteboardAutomation.displayState;
  }

  if (
    patient.state === PatientState.Triage &&
    (arrival.triagePending || arrival.waitingRoomStatus === 'waiting-for-triage')
  ) {
    return 'Waiting for Triage';
  }

  const waitingRoomLabel = resolvePatientWaitingRoomMessage(patient, {}, 'staff');
  if (waitingRoomLabel && patient.state === PatientState.Triage) {
    return waitingRoomLabel;
  }

  return String(patient.state);
}

export function toggleWhiteboardSort(
  current: Pick<WhiteboardViewFilters, 'sortColumn' | 'sortDirection'>,
  column: WhiteboardSortColumn,
): Pick<WhiteboardViewFilters, 'sortColumn' | 'sortDirection'> {
  if (current.sortColumn === column) {
    return {
      sortColumn: column,
      sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc',
    };
  }
  return { sortColumn: column, sortDirection: 'asc' };
}