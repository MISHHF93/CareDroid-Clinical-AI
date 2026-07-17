/**
 * Thin FE wrap: emergency board slices → CIG snapshot (PR-2b).
 *
 * Keeps Zustand/store imports out of lib/cig; this module is the FE-side glue.
 */

import {
  adaptFeEmergencyBoardToNeutralDto,
  projectFromNeutralDto,
  type CigGraphSnapshot,
  type FeEmergencyBoardSource,
} from '../../lib/cig';
import type {
  Alert,
  EMSArrival,
  Patient,
  QueueSummary,
  Room,
  Staff,
} from '../types/emergency';

export type BuildCigFromEmergencyBoardInput = {
  tenantId?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
  generatedAt?: string | null;
  snapshotVersion?: number | null;
  durability?: 'durable' | 'session' | 'ephemeral';
  patients?: readonly Patient[] | null;
  staff?: readonly Staff[] | null;
  rooms?: readonly Room[] | null;
  queues?: readonly QueueSummary[] | null;
  alerts?: readonly Alert[] | null;
  emsArrivals?: readonly EMSArrival[] | null;
  recommendations?: FeEmergencyBoardSource['recommendations'];
  serviceSignals?: FeEmergencyBoardSource['serviceSignals'];
  departments?: FeEmergencyBoardSource['departments'];
};

/**
 * Adapt FE emergency board types and project a Mode B CIG snapshot.
 * Does not claim multi-user durable twin (durability defaults to session).
 */
export function buildCigSnapshotFromEmergencyBoard(
  input: BuildCigFromEmergencyBoardInput,
): CigGraphSnapshot {
  const source: FeEmergencyBoardSource = {
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    generatedAt: input.generatedAt,
    snapshotVersion: input.snapshotVersion,
    durability: input.durability ?? 'session',
    patients: input.patients ?? undefined,
    staff: input.staff ?? undefined,
    rooms: input.rooms ?? undefined,
    queues: input.queues ?? undefined,
    alerts: input.alerts ?? undefined,
    emsArrivals: input.emsArrivals ?? undefined,
    recommendations: input.recommendations ?? undefined,
    serviceSignals: input.serviceSignals ?? undefined,
    departments: input.departments ?? undefined,
  };
  const dto = adaptFeEmergencyBoardToNeutralDto(source);
  return projectFromNeutralDto(dto);
}
