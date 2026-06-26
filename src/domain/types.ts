/**
 * CareDroid unified domain model — re-exports canonical ED types.
 * Extend here as tenant-scoped entities move from fixtures to PostgreSQL.
 */
import type { Vitals as EmergencyVitals } from '../types/emergency';

export type {
  EntityId,
  ISODateString,
  Patient,
  PatientFlagRecord,
  PatientState,
  Priority,
  Vitals,
} from '../types/emergency';

export {
  PatientFlag,
  PatientState as PatientStateEnum,
  Priority as PriorityEnum,
  normalizePriority,
} from '../types/emergency';

/** SaaS tenant boundary */
export type Tenant = Readonly<{
  id: string;
  name: string;
  slug: string;
}>;

export type Hospital = Readonly<{
  id: string;
  tenantId: string;
  name: string;
}>;

export type Department = Readonly<{
  id: string;
  hospitalId: string;
  name: string;
  type: 'emergency' | string;
}>;

export type Role = Readonly<{
  id: string;
  label: string;
}>;

export type User = Readonly<{
  id: string;
  tenantId: string;
  displayName: string;
  roleIds: readonly string[];
}>;

/** Operational patient card shown on whiteboard and reception surfaces. */
export type PatientCard = Readonly<{
  patientId: string;
  displayName: string;
  acuity?: string;
  roomLabel?: string;
  waitMinutes?: number;
  flags?: readonly string[];
}>;

export type TriageAssessment = Readonly<{
  patientId: string;
  acuity: string;
  assessedAt: string;
  assessedBy?: string;
  vitals?: EmergencyVitals;
}>;

export type Encounter = Readonly<{
  id: string;
  patientId: string;
  departmentId: string;
  arrivedAt: string;
}>;

export type EDStatus = Readonly<{
  census: number;
  boardingCount: number;
  waitingCount: number;
  updatedAt: string;
}>;

export type Room = Readonly<{
  id: string;
  label: string;
  zone?: string;
}>;

export type Bed = Readonly<{
  id: string;
  roomId: string;
  label: string;
  occupied: boolean;
}>;

export type QueuePosition = Readonly<{
  patientId: string;
  position: number;
  queueId: string;
}>;

export type ClinicalCalculatorResult = Readonly<{
  id: string;
  calculatorId: string;
  patientId?: string;
  score: number | string | null;
  recordedAt: string;
  recordedBy?: string;
}>;

export type CopilotInteraction = Readonly<{
  id: string;
  patientId?: string;
  prompt: string;
  response: string;
  disclaimer: string;
  createdAt: string;
}>;

export type EMSPrearrival = Readonly<{
  id: string;
  etaMinutes?: number;
  chiefComplaint?: string;
  acuity?: string;
}>;

export type Referral = Readonly<{
  id: string;
  patientId: string;
  destination: string;
  status: string;
}>;

export type AuditLog = Readonly<{
  id: string;
  action: string;
  actorId?: string;
  resourceType: string;
  resourceId?: string;
  recordedAt: string;
}>;

export type FeatureEntitlement = Readonly<{
  featureId: string;
  enabled: boolean;
  tenantId: string;
}>;