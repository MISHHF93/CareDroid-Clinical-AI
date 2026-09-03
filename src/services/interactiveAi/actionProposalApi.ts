/**
 * Real backend-backed client for AI action proposals. Replaces the former
 * `actionProposalService.ts`, which was a client-only in-memory Map -- every
 * "Approve & execute" silently vanished on refresh despite the UI implying a
 * durable, auditable record. A real, tenant-scoped, hash-chain-audited
 * backend API for this already existed (`backend/src/modules/ai/ai.controller.ts`
 * `/api/ai/proposals*`) with zero live frontend callers; this wires to it.
 *
 * The backend doesn't model `evidence`/`citations`/`toolVersion`/
 * `workflowContext`/`encounterId` (confirmed no real caller ever set or read
 * any of them through the old in-memory service) -- defaulted/omitted here
 * rather than fabricated.
 */

import { apiFetchJson, getApiErrorMessage } from '../apiClient';
import type {
  AIActionProposal,
  AiActionProposalState,
  AiRiskLevel,
} from '../../contracts/interactiveAi';

export type CreateActionProposalInput = {
  originatingRequestId: string;
  correlationId: string;
  sessionId?: string;
  patientId?: string;
  toolName: string;
  validatedArguments: Record<string, unknown>;
  expectedEffect: string;
  riskLevel: AiRiskLevel;
  requiredPermission: string;
  requiresApproval?: boolean;
  model: string;
  promptVersion: string;
  expiresInMs?: number;
  rollbackCapable?: boolean;
  reversibleWindowMs?: number;
  previewSummary: string;
  dataWillChange: string[];
  ownerRole?: string;
  // Accepted for source-compatibility with the removed in-memory service's
  // input shape; the backend doesn't model these (see file header) so they
  // are not sent.
  encounterId?: string;
  workflowContext?: Record<string, unknown>;
  toolVersion?: string;
  evidence?: AIActionProposal['evidence'];
  citations?: AIActionProposal['citations'];
  ownerUserId?: string;
};

async function guardedJson(path: string, options: any = {}) {
  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || getApiErrorMessage(null, response));
    }
    return data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error));
  }
}

const jsonHeaders = { 'content-type': 'application/json' };

function mapServerProposal(json: Record<string, unknown>): AIActionProposal {
  return {
    proposalId: String(json.proposalId),
    originatingRequestId: String(json.originatingRequestId ?? ''),
    correlationId: String(json.correlationId ?? ''),
    sessionId: json.sessionId as string | undefined,
    patientId: json.patientId as string | undefined,
    encounterId: undefined,
    workflowContext: undefined,
    toolName: String(json.toolName ?? ''),
    toolVersion: undefined,
    validatedArguments: (json.validatedArguments as Record<string, unknown>) || {},
    expectedEffect: String(json.expectedEffect ?? ''),
    riskLevel: json.riskLevel as AIActionProposal['riskLevel'],
    requiredPermission: String(json.requiredPermission ?? ''),
    requiresApproval: Boolean(json.requiresApproval),
    evidence: [],
    citations: [],
    model: String(json.model ?? ''),
    promptVersion: String(json.promptVersion ?? ''),
    expiresAt: String(json.expiresAt ?? ''),
    rollbackCapable: Boolean(json.rollbackCapable),
    reversibleUntil: json.reversibleUntil as string | undefined,
    state: json.state as AiActionProposalState,
    previewSummary: String(json.previewSummary ?? ''),
    dataWillChange: Array.isArray(json.dataWillChange) ? json.dataWillChange.map(String) : [],
    createdAt: String(json.createdAt ?? ''),
    updatedAt: String(json.updatedAt ?? ''),
    ownerUserId: json.ownerUserId as string | undefined,
    ownerRole: json.ownerRole as string | undefined,
    rejectionReason: json.rejectionReason as string | undefined,
    executionResult: json.executionResult as Record<string, unknown> | undefined,
    errorCode: json.errorCode as string | undefined,
  };
}

export async function createActionProposalApi(
  input: CreateActionProposalInput,
): Promise<AIActionProposal> {
  // Backend ValidationPipe runs with forbidNonWhitelisted:true -- CreateAiActionProposalDto
  // does not declare encounterId/workflowContext/toolVersion/evidence/citations/
  // ownerUserId/expiresInMs (see the input type's own comment), so sending them
  // would 400 the whole request. Build the body explicitly rather than forwarding
  // the input object as-is.
  const body = {
    originatingRequestId: input.originatingRequestId,
    correlationId: input.correlationId,
    sessionId: input.sessionId,
    patientId: input.patientId,
    toolName: input.toolName,
    validatedArguments: input.validatedArguments,
    expectedEffect: input.expectedEffect,
    riskLevel: input.riskLevel,
    requiredPermission: input.requiredPermission,
    requiresApproval: input.requiresApproval,
    model: input.model,
    promptVersion: input.promptVersion,
    rollbackCapable: input.rollbackCapable,
    reversibleWindowMs: input.reversibleWindowMs,
    previewSummary: input.previewSummary,
    dataWillChange: input.dataWillChange,
    ownerRole: input.ownerRole,
  };
  const data = await guardedJson('/api/ai/proposals', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  return mapServerProposal(data);
}

export async function getActionProposalApi(proposalId: string): Promise<AIActionProposal | null> {
  try {
    const data = await guardedJson(`/api/ai/proposals/${encodeURIComponent(proposalId)}`);
    return mapServerProposal(data);
  } catch {
    return null;
  }
}

export async function listActionProposalsApi(filter?: {
  state?: AiActionProposalState;
  mine?: boolean;
}): Promise<AIActionProposal[]> {
  const params = new URLSearchParams();
  if (filter?.state) params.set('state', filter.state);
  if (filter?.mine) params.set('mine', '1');
  const query = params.toString();
  const data = await guardedJson(`/api/ai/proposals${query ? `?${query}` : ''}`);
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(mapServerProposal);
}

export async function approveProposalApi(proposalId: string): Promise<AIActionProposal> {
  const data = await guardedJson(`/api/ai/proposals/${encodeURIComponent(proposalId)}/approve`, {
    method: 'POST',
  });
  return mapServerProposal(data);
}

export async function rejectProposalApi(
  proposalId: string,
  reason: string,
): Promise<AIActionProposal> {
  const data = await guardedJson(`/api/ai/proposals/${encodeURIComponent(proposalId)}/reject`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ reason }),
  });
  return mapServerProposal(data);
}

export async function executeProposalApi(
  proposalId: string,
  result?: Record<string, unknown>,
): Promise<AIActionProposal> {
  const data = await guardedJson(`/api/ai/proposals/${encodeURIComponent(proposalId)}/execute`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ result }),
  });
  return mapServerProposal(data);
}

export async function rollbackProposalApi(proposalId: string): Promise<AIActionProposal> {
  const data = await guardedJson(`/api/ai/proposals/${encodeURIComponent(proposalId)}/rollback`, {
    method: 'POST',
  });
  return mapServerProposal(data);
}
