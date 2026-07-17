/**
 * Nest emergency-os board snapshot → NeutralBoardDto (PR-2c).
 *
 * Duck-typed to EmergencyPatient / Room / Staff / Alert shapes without Nest DI.
 * Mode B default: durability session until K13 durable read cutover.
 */

import {
  adaptFeEmergencyBoardToNeutralDto,
  type FeAlertLike,
  type FeEmergencyBoardSource,
  type FePatientLike,
  type FeQueueLike,
  type FeRoomLike,
  type FeStaffLike,
} from './feEmergencyStoreAdapter';
import type { NeutralBoardDto } from '../neutralBoardDto';

/** Mirrors backend EmergencyPatient (subset used for graph projection). */
export type NestPatientLike = {
  id: string;
  mrn?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  state: string;
  priority?: string | null;
  chiefComplaint?: string | null;
  assignedStaffId?: string | null;
  assignedPhysicianId?: string | null;
  roomId?: string | null;
  arrivalTime?: string | null;
  triageTime?: string | null;
  updatedAt?: string | null;
  arrival?: { arrivalTimestamp?: string | null } | null;
};

export type NestRoomLike = {
  id: string;
  name?: string | null;
  type?: string | null;
  status: string;
  patientId?: string | null;
};

export type NestStaffLike = {
  id: string;
  name?: string | null;
  role?: string | null;
  active?: boolean | null;
  status?: string | null;
  activePatients?: number | null;
};

export type NestAlertLike = {
  id: string;
  severity?: string | null;
  title?: string | null;
  message?: string | null;
  patientId?: string | null;
  createdAt?: string | null;
  dismissed?: boolean | null;
  acknowledged?: boolean | null;
  ownerRole?: string | null;
  type?: string | null;
};

export type NestQueueLike = FeQueueLike;

export type NestEmergencyBoardSource = {
  tenantId?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
  generatedAt?: string | null;
  snapshotVersion?: number | null;
  durability?: 'durable' | 'session' | 'ephemeral';
  patients?: readonly NestPatientLike[] | null;
  rooms?: readonly NestRoomLike[] | null;
  staff?: readonly NestStaffLike[] | null;
  alerts?: readonly NestAlertLike[] | null;
  queues?: readonly NestQueueLike[] | null;
  recommendations?: FeEmergencyBoardSource['recommendations'];
  serviceSignals?: FeEmergencyBoardSource['serviceSignals'];
  departments?: FeEmergencyBoardSource['departments'];
  emsArrivals?: FeEmergencyBoardSource['emsArrivals'];
};

function mapNestPatient(patient: NestPatientLike): FePatientLike {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    mrn: patient.mrn,
    state: patient.state,
    priority: patient.priority,
    chiefComplaint: patient.chiefComplaint,
    assignedStaffId: patient.assignedStaffId,
    assignedPhysicianId: patient.assignedPhysicianId,
    roomId: patient.roomId,
    arrivalTime: patient.arrival?.arrivalTimestamp || patient.arrivalTime,
    updatedAt: patient.updatedAt || patient.triageTime || patient.arrivalTime,
  };
}

function mapNestRoom(room: NestRoomLike): FeRoomLike {
  return {
    id: room.id,
    name: room.name,
    type: room.type,
    status: room.status,
    patientId: room.patientId,
  };
}

function mapNestStaff(member: NestStaffLike): FeStaffLike {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    status: member.status ?? (member.active === false ? 'OffShift' : 'OnShift'),
    active: member.active,
    activePatients: member.activePatients,
  };
}

function mapNestAlert(alert: NestAlertLike): FeAlertLike {
  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    patientId: alert.patientId,
    createdAt: alert.createdAt,
    dismissed: alert.dismissed,
    acknowledged: alert.acknowledged,
    ownerRole: alert.ownerRole,
    type: alert.type,
  };
}

/**
 * Derive simple queues from patient states when Nest does not supply queue summaries.
 */
export function deriveQueuesFromNestPatients(
  patients: readonly NestPatientLike[],
): NestQueueLike[] {
  const counts = new Map<string, { count: number; breached: boolean }>();
  for (const patient of patients) {
    if (patient.state === 'Discharge' || patient.state === 'Deceased') continue;
    const key = patient.state;
    const prev = counts.get(key) || { count: 0, breached: false };
    prev.count += 1;
    // Waiting / Results with volume heuristic
    if ((key === 'Waiting' || key === 'Results') && prev.count >= 3) {
      prev.breached = true;
    }
    counts.set(key, prev);
  }
  return [...counts.entries()].map(([state, meta]) => ({
    id: `queue-${state.toLowerCase()}`,
    label: state,
    type: state,
    count: meta.count,
    breached: meta.breached,
  }));
}

/**
 * Map Nest emergency-os in-memory board into NeutralBoardDto (Mode B session default).
 */
export function adaptNestEmergencyOsToNeutralDto(
  source: NestEmergencyBoardSource,
): NeutralBoardDto {
  const patients = (source.patients ?? []).map(mapNestPatient);
  const queues: FeQueueLike[] =
    source.queues && source.queues.length > 0
      ? [...source.queues]
      : deriveQueuesFromNestPatients(source.patients ?? []);

  const feSource: FeEmergencyBoardSource = {
    tenantId: source.tenantId,
    organizationId: source.organizationId,
    workspaceId: source.workspaceId,
    generatedAt: source.generatedAt,
    snapshotVersion: source.snapshotVersion,
    durability: source.durability ?? 'session',
    patients,
    rooms: (source.rooms ?? []).map(mapNestRoom),
    staff: (source.staff ?? []).map(mapNestStaff),
    alerts: (source.alerts ?? []).map(mapNestAlert),
    queues,
    recommendations: source.recommendations ?? undefined,
    serviceSignals: source.serviceSignals ?? undefined,
    departments: source.departments ?? undefined,
    emsArrivals: source.emsArrivals ?? undefined,
  };

  return adaptFeEmergencyBoardToNeutralDto(feSource);
}
