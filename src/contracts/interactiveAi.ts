/**
 * CareDroid Interactive Intelligence contracts.
 *
 * AI helps users complete work safely, visibly, and reversibly — never as an
 * autonomous clinical actor. Every executable suggestion is an AIActionProposal
 * that must pass through explicit human-controlled states.
 */

import type { CareDroidUnifiedChannel } from '../../lib/ai/unifiedAiContracts';

/** Explicit stream / task progress states — never an indefinite spinner alone. */
export const AI_STREAM_STATES = [
  'validating_request',
  'retrieving_evidence',
  'reranking_sources',
  'selecting_tools',
  'executing_tools',
  'checking_safety',
  'awaiting_human_approval',
  'preparing_response',
  'completed',
  'cancelled',
  'timed_out',
  'insufficient_evidence',
  'blocked',
  'failed',
] as const;

export type AiStreamState = (typeof AI_STREAM_STATES)[number];

export const AI_ACTION_PROPOSAL_STATES = [
  'proposed',
  'reviewing',
  'approved',
  'executing',
  'completed',
  'failed',
  'rejected',
  'cancelled',
  'expired',
  'rolled_back',
] as const;

export type AiActionProposalState = (typeof AI_ACTION_PROPOSAL_STATES)[number];

export type AiRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type AiDeliveryLevel = 'quiet' | 'normal' | 'attention' | 'urgent';

export type WorkflowAiCardUrgency = 'info' | 'attention' | 'urgent' | 'critical';

export type InteractiveContextKind =
  | 'confirmed_patient_fact'
  | 'user_entered_draft'
  | 'ocr_extraction'
  | 'retrieved_evidence'
  | 'prediction'
  | 'generated_language'
  | 'operational_metric'
  | 'workflow_rule';

export interface InteractiveContextItem {
  id: string;
  kind: InteractiveContextKind;
  label: string;
  summary: string;
  sourceId?: string;
  version?: string;
  confidence?: number;
  removable: boolean;
  expiresAt?: string;
  patientId?: string;
  encounterId?: string;
}

export interface InteractiveSessionScope {
  tenantId: string;
  facilityId?: string;
  organizationId?: string;
  workspaceId?: string;
  role: string;
  channel: CareDroidUnifiedChannel | string;
  purpose: string;
  patientId?: string;
  encounterId?: string;
  emsUnitId?: string;
  documentId?: string;
  queueId?: string;
  operationalPeriod?: string;
}

export interface InteractiveSession {
  sessionId: string;
  scope: InteractiveSessionScope;
  attachedContext: InteractiveContextItem[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'completed' | 'expired';
}

export interface AIActionProposal {
  proposalId: string;
  originatingRequestId: string;
  correlationId: string;
  sessionId?: string;
  patientId?: string;
  encounterId?: string;
  workflowContext?: Record<string, unknown>;
  toolName: string;
  toolVersion?: string;
  validatedArguments: Record<string, unknown>;
  expectedEffect: string;
  riskLevel: AiRiskLevel;
  requiredPermission: string;
  requiresApproval: boolean;
  evidence: Array<{ id: string; title?: string; snippet?: string; score?: number }>;
  citations: Array<{ id: string; label: string }>;
  model: string;
  promptVersion: string;
  expiresAt: string;
  rollbackCapable: boolean;
  reversibleUntil?: string;
  state: AiActionProposalState;
  previewSummary: string;
  dataWillChange: string[];
  createdAt: string;
  updatedAt: string;
  ownerUserId?: string;
  ownerRole?: string;
  rejectionReason?: string;
  executionResult?: Record<string, unknown>;
  errorCode?: string;
}

export interface WorkflowAiCard {
  cardId: string;
  dedupeKey: string;
  title: string;
  source: string;
  summary: string;
  evidence: Array<{ id: string; label: string }>;
  urgency: WorkflowAiCardUrgency;
  confidence?: number;
  timestamp: string;
  expiresAt?: string;
  ownerRole?: string;
  ownerUserId?: string;
  recommendedActions: Array<{
    id: string;
    label: string;
    proposalTemplateId?: string;
    href?: string;
    riskLevel: AiRiskLevel;
    requiresApproval: boolean;
  }>;
  workspaceLink?: string;
  channel: CareDroidUnifiedChannel | string;
  patientId?: string;
  permission: string;
  dismissible: boolean;
  acknowledged: boolean;
  dismissed: boolean;
  deliveryLevel: AiDeliveryLevel;
  triggerEvent: string;
  model?: string;
  promptVersion?: string;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  task: string;
  channel: CareDroidUnifiedChannel | string;
  requiredPermission: string;
  templateId: string;
  riskLevel: AiRiskLevel;
}

export interface StreamProgressEvent {
  requestId: string;
  correlationId: string;
  state: AiStreamState;
  message: string;
  percent?: number;
  sequence: number;
  occurredAt: string;
  cancellable: boolean;
}

export type InteractiveRealtimeTopic =
  | 'ai.stream.progress'
  | 'ai.stream.token'
  | 'ai.task.progress'
  | 'ai.proposal.updated'
  | 'ai.card.created'
  | 'ai.card.updated'
  | 'queue.update'
  | 'ems.eta.update'
  | 'model.health'
  | 'document.processing'
  | 'human.review.updated'
  | 'collaboration.message'
  | 'heartbeat'
  | 'connected';

export interface TypedRealtimeEvent<TPayload = unknown> {
  eventId: string;
  topic: InteractiveRealtimeTopic | string;
  sequence: number;
  occurredAt: string;
  freshnessMs?: number;
  tenantId?: string;
  organizationId?: string;
  payload: TPayload;
}

export interface RealtimeConnectionStatus {
  status: 'connected' | 'reconnecting' | 'offline' | 'degraded' | 'polling';
  mode: 'sse' | 'websocket' | 'polling' | 'none';
  message: string;
  updatedAt: string;
  lastEventAt?: string;
  isStale: boolean;
}

export const INTERACTIVE_AI_CONTRACT_VERSION = '1.0.0';

export function isTerminalStreamState(state: AiStreamState): boolean {
  return (
    state === 'completed' ||
    state === 'cancelled' ||
    state === 'timed_out' ||
    state === 'insufficient_evidence' ||
    state === 'blocked' ||
    state === 'failed'
  );
}

export function isTerminalProposalState(state: AiActionProposalState): boolean {
  return (
    state === 'completed' ||
    state === 'failed' ||
    state === 'rejected' ||
    state === 'cancelled' ||
    state === 'expired' ||
    state === 'rolled_back'
  );
}

export function canTransitionProposal(
  from: AiActionProposalState,
  to: AiActionProposalState,
): boolean {
  const allowed: Record<AiActionProposalState, AiActionProposalState[]> = {
    proposed: ['reviewing', 'approved', 'rejected', 'cancelled', 'expired'],
    reviewing: ['approved', 'rejected', 'cancelled', 'expired', 'proposed'],
    approved: ['executing', 'cancelled', 'expired'],
    executing: ['completed', 'failed', 'cancelled'],
    completed: ['rolled_back'],
    failed: ['proposed'],
    rejected: [],
    cancelled: [],
    expired: [],
    rolled_back: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function streamStateLabel(state: AiStreamState): string {
  const labels: Record<AiStreamState, string> = {
    validating_request: 'Validating request',
    retrieving_evidence: 'Retrieving evidence',
    reranking_sources: 'Reranking sources',
    selecting_tools: 'Selecting tools',
    executing_tools: 'Executing tools',
    checking_safety: 'Checking safety policy',
    awaiting_human_approval: 'Awaiting human approval',
    preparing_response: 'Preparing response',
    completed: 'Completed',
    cancelled: 'Cancelled',
    timed_out: 'Timed out',
    insufficient_evidence: 'Insufficient evidence',
    blocked: 'Blocked by safety',
    failed: 'Failed',
  };
  return labels[state];
}
