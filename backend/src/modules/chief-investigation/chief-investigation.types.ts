/**
 * Chief Investigation — vertical-slice contracts
 *
 * A bounded "investigate this patient" command executed by a deterministic
 * plan runner (no LLM planning in v1). Autonomy is restricted to:
 *   LEVEL 0 (observe/retrieve/calculate) and LEVEL 2 (prepare proposals).
 * Nothing clinically consequential can execute from this path; every
 * suggested action becomes an AiActionProposal that requires human approval.
 */

export type InvestigationStepStatus = 'completed' | 'warning' | 'failed' | 'skipped';

/**
 * Truthful result states. The runner never fabricates certainty: an answer is
 * only as strong as the evidence behind it, and the state says which.
 */
export type InvestigationFindingState =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'INSUFFICIENT_DATA'
  | 'STALE_DATA'
  | 'TOOL_FAILURE'
  | 'OUTSIDE_SCOPE'
  | 'REQUIRES_HUMAN_REVIEW';

export type InvestigationAutonomyLevel = 'LEVEL_0_OBSERVE' | 'LEVEL_2_PREPARE';

export interface InvestigationStepTrace {
  stepId: string;
  label: string;
  status: InvestigationStepStatus;
  detail: string;
}

export interface InvestigationFinding {
  state: InvestigationFindingState;
  summary: string;
  /** Concrete inputs this finding rests on (field-level, not prose-only). */
  evidence: string[];
  sources: string[];
}

/** A Level-2 preparation. Never executed here — approval happens via AiActionProposal. */
export interface PreparedAction {
  actionType: string;
  description: string;
  rationale: string;
  requiresApproval: true;
  proposalId?: string;
}

export interface PreparedActionSpec {
  actionType: string;
  description: string;
  rationale: string;
  expectedEffect: string;
}

export interface InvestigationPatientLabel {
  patientId: string;
  mrn?: string;
  name?: string;
  age?: number;
  sex?: string;
  priority?: string;
  edState?: string;
  chiefComplaint?: string;
}

export interface InvestigationRunResult {
  runId: string;
  goal: 'deterioration_investigation';
  createdAt: string;
  requestedByUserId: string;
  organizationId?: string;
  patient: InvestigationPatientLabel;
  planVersion: string;
  autonomyLevelUsed: InvestigationAutonomyLevel;
  steps: InvestigationStepTrace[];
  findings: InvestigationFinding[];
  preparedActions: PreparedAction[];
  overallState: InvestigationFindingState;
  noClinicalActionTaken: true;
  disclaimer: string;
}

/** Deterministic synthesis input assembled by the orchestrating service. */
export interface InvestigationContext {
  patientVerified: boolean;
  hasVitals: boolean;
  vitalsAgeMinutes: number | null;
  news2Executed: boolean;
  news2Total?: number;
  news2RiskBand?: string;
  news2HasRed?: boolean;
  news2FailedReason?: string;
  trendNotes: string[];
  assumptions: string[];
}
