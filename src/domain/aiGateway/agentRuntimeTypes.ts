/**
 * CareDroid Governed Agent Runtime Types
 * Strictly enforces agent identity, boundaries, permitted tools, human sign-off gates,
 * and auditable execution trails with data minimization and clinical provenance.
 */

import { HospitalRole } from '../../lib/users/userTypes';

export type AgentAutonomyLevel =
  | 'read_only'
  | 'recommendation_only'
  | 'human_in_the_loop'
  | 'autonomous_administrative';

export interface AgentIdentity {
  id: string;
  name: string;
  roleProfileId: string;
  assignedHospitalRole: HospitalRole;
  description: string;
  version: string;
}

export interface AgentBoundaries {
  clinicalScope: string[];
  maxAutonomyLevel: AgentAutonomyLevel;
  requiresHumanSignOff: boolean;
  prohibitedActions: string[];
}

export interface ApprovedToolSpec {
  toolId: string;
  name: string;
  description: string;
  requiredPermissions: string[];
  isClinicalMutation: boolean;
  requiresClinicianReview: boolean;
  maxCallsPerExecution: number;
}

export interface AgentMemoryPolicy {
  maxContextTokens: number;
  maxHistoryTurns: number;
  episodicMemoryAllowed: boolean;
  retentionHours: number;
  phiMaskingRequired: boolean;
}

export interface AgentEscalationPolicy {
  escalateToRole: HospitalRole;
  unacknowledgedTimeoutSeconds: number;
  escalationTriggers: string[];
}

export interface GovernedAgentSpec {
  identity: AgentIdentity;
  boundaries: AgentBoundaries;
  approvedTools: ApprovedToolSpec[];
  memoryPolicy: AgentMemoryPolicy;
  escalationPolicy: AgentEscalationPolicy;
  preferredModelId?: string;
  isActive: boolean;
}

export interface AgentToolInvocation {
  toolId: string;
  timestamp: string;
  parameters: Record<string, unknown>;
  output: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface AgentExecutionAuditRecord {
  executionId: string;
  agentId: string;
  timestamp: string;
  triggeredByUserId: string;
  userRole: string;
  intent: string;
  reasoningSteps: string[];
  toolInvocations: AgentToolInvocation[];
  finalOutput: unknown;
  requiresClinicianReview: boolean;
  isClinicianConfirmed: boolean;
  clinicianOverrideAvailable: boolean;
  latencyMs: number;
  tokensConsumed: number;
  estimatedCostUsd: number;
  provenanceHash: string;
}

export interface AgentTaskInput {
  intent: string;
  patientId?: string;
  encounterId?: string;
  clinicalContext?: Record<string, unknown>;
  rawUserPrompt?: string;
  initiatorUserId: string;
  initiatorRole: string;
  initiatorPermissions: string[];
}

export interface AgentTaskResponse<T = unknown> {
  executionId: string;
  agentId: string;
  status: 'completed' | 'pending_clinician_review' | 'rejected' | 'failed' | 'escalated';
  result?: T;
  confidence: number;
  reasoning: string[];
  warnings: string[];
  nextActions: string[];
  requiresClinicianReview: boolean;
  clinicianOverrideAvailable: boolean;
  auditRecord: AgentExecutionAuditRecord;
}
