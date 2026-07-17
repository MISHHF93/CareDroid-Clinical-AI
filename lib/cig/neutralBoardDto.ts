/**
 * Neutral board DTO — projector input shared by FE and Nest adapters (PR-2a).
 *
 * Forbidden imports in this module and projectFromNeutralDto:
 * window, Zustand, Vite, Nest DI, src/store, src/types/emergency.
 * Adapters map domain shapes → these primitives.
 */

export type NeutralBoardPatient = {
  id: string;
  /** Display label only — may contain PHI; phiClass=direct on projected node */
  label: string;
  mrn?: string | null;
  state: string;
  priority?: string | null;
  chiefComplaint?: string | null;
  assignedStaffId?: string | null;
  assignedPhysicianId?: string | null;
  roomId?: string | null;
  queueId?: string | null;
  departmentIds?: readonly string[];
  workflowStepId?: string | null;
  workflowStepLabel?: string | null;
  /** ISO timestamp of last SoT mutation */
  updatedAt?: string | null;
  arrivedAt?: string | null;
  /** When true, soft-archive rather than omit if within retention */
  discharged?: boolean;
  dischargedAt?: string | null;
};

export type NeutralBoardStaff = {
  id: string;
  label: string;
  role?: string | null;
  status?: string | null;
  activePatientCount?: number | null;
  updatedAt?: string | null;
};

export type NeutralBoardRoom = {
  id: string;
  label: string;
  type?: string | null;
  status: string;
  patientId?: string | null;
  updatedAt?: string | null;
};

export type NeutralBoardQueue = {
  id: string;
  label: string;
  count: number;
  breached?: boolean;
  oldestWaitMinutes?: number | null;
  /** Match patients by state/label when queueId unset */
  matchState?: string | null;
  updatedAt?: string | null;
};

export type NeutralBoardAlert = {
  id: string;
  label: string;
  summary?: string | null;
  severity: 'critical' | 'warning' | 'info' | 'neutral';
  patientId?: string | null;
  acknowledged?: boolean;
  dismissed?: boolean;
  ownerRole?: string | null;
  category?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type NeutralBoardDiagnostic = {
  id: string;
  label: string;
  patientId: string;
  status: string;
  summary?: string | null;
  blocking?: boolean;
  updatedAt?: string | null;
};

export type NeutralBoardEmsUnit = {
  id: string;
  label: string;
  status: string;
  etaMinutes?: number | null;
  patientId?: string | null;
  chiefComplaint?: string | null;
  updatedAt?: string | null;
};

export type NeutralBoardDepartment = {
  id: string;
  label: string;
  summary?: string | null;
  updatedAt?: string | null;
};

export type NeutralBoardService = {
  id: string;
  label: string;
  health: 'healthy' | 'degraded' | 'critical' | 'unknown';
  latencyMs?: number | null;
  errorRate?: number | null;
  version?: string | null;
  /** sourceIds of diagnostics/rooms this service blocks when degraded */
  blocksEntityIds?: readonly { entityType: string; sourceId: string }[];
  updatedAt?: string | null;
};

export type NeutralBoardRecommendation = {
  id: string;
  label: string;
  summary?: string | null;
  patientId?: string | null;
  confidence?: number | null;
  humanReviewRequired?: boolean;
  updatedAt?: string | null;
};

export type NeutralBoardWorkflowStep = {
  id: string;
  label: string;
  summary?: string | null;
  route?: string | null;
  updatedAt?: string | null;
};

/**
 * Complete input for pure projection.
 * Adapters must fill tenantId and durability defaults (Mode B → session).
 */
export type NeutralBoardDto = {
  tenantId: string;
  organizationId?: string;
  workspaceId?: string;
  /** ISO clock for projection (injectable for tests) */
  generatedAt: string;
  /**
   * Monotonic tenant snapshot watermark. Callers increment after successful project.
   * Projector copies into meta.snapshotVersion without inventing clinical facts.
   */
  snapshotVersion: number;
  /**
   * Mode B default: session. Mode A after durable SoT cutover may pass durable.
   */
  durability: 'durable' | 'session' | 'ephemeral';
  projectorGeneration?: string;
  patients?: readonly NeutralBoardPatient[];
  staff?: readonly NeutralBoardStaff[];
  rooms?: readonly NeutralBoardRoom[];
  queues?: readonly NeutralBoardQueue[];
  alerts?: readonly NeutralBoardAlert[];
  diagnostics?: readonly NeutralBoardDiagnostic[];
  emsUnits?: readonly NeutralBoardEmsUnit[];
  departments?: readonly NeutralBoardDepartment[];
  services?: readonly NeutralBoardService[];
  recommendations?: readonly NeutralBoardRecommendation[];
  workflowSteps?: readonly NeutralBoardWorkflowStep[];
};
