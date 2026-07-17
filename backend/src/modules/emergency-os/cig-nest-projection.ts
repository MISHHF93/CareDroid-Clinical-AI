/**
 * Thin Nest wrap: emergency-os board arrays → CIG snapshot (PR-2c).
 * Mode B session projection only — no multi-user durable twin claim.
 */

import {
  adaptNestEmergencyOsToNeutralDto,
  projectFromNeutralDto,
  type CigGraphSnapshot,
  type NestEmergencyBoardSource,
} from '../../../../lib/cig';
import type {
  EmergencyAlert,
  EmergencyPatient,
  EmergencyRoom,
  EmergencyStaff,
} from './emergency-os.types';

export type BuildCigFromNestBoardInput = {
  tenantId?: string | null;
  organizationId?: string | null;
  generatedAt?: string | null;
  snapshotVersion?: number | null;
  durability?: 'durable' | 'session' | 'ephemeral';
  patients?: readonly EmergencyPatient[] | null;
  rooms?: readonly EmergencyRoom[] | null;
  staff?: readonly EmergencyStaff[] | null;
  alerts?: readonly EmergencyAlert[] | null;
  queues?: NestEmergencyBoardSource['queues'];
  serviceSignals?: NestEmergencyBoardSource['serviceSignals'];
  recommendations?: NestEmergencyBoardSource['recommendations'];
};

export function buildCigSnapshotFromNestBoard(
  input: BuildCigFromNestBoardInput,
): CigGraphSnapshot {
  const source: NestEmergencyBoardSource = {
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    generatedAt: input.generatedAt,
    snapshotVersion: input.snapshotVersion,
    durability: input.durability ?? 'session',
    patients: input.patients ?? undefined,
    rooms: input.rooms ?? undefined,
    staff: input.staff ?? undefined,
    alerts: input.alerts ?? undefined,
    queues: input.queues ?? undefined,
    serviceSignals: input.serviceSignals ?? undefined,
    recommendations: input.recommendations ?? undefined,
  };
  return projectFromNeutralDto(adaptNestEmergencyOsToNeutralDto(source));
}
