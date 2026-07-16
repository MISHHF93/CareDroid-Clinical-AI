/**
 * AIActionProposal state machine — every executable AI suggestion is previewable,
 * permissioned, and reversible only when explicitly allowed.
 */

import {
  canTransitionProposal,
  isTerminalProposalState,
  type AIActionProposal,
  type AiActionProposalState,
  type AiRiskLevel,
} from '../../contracts/interactiveAi';

export type CreateActionProposalInput = {
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
  requiresApproval?: boolean;
  evidence?: AIActionProposal['evidence'];
  citations?: AIActionProposal['citations'];
  model: string;
  promptVersion: string;
  expiresInMs?: number;
  rollbackCapable?: boolean;
  reversibleWindowMs?: number;
  previewSummary: string;
  dataWillChange: string[];
  ownerUserId?: string;
  ownerRole?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const store = new Map<string, AIActionProposal>();

export function createActionProposal(input: CreateActionProposalInput): AIActionProposal {
  const createdAt = nowIso();
  const expiresInMs = input.expiresInMs ?? 30 * 60 * 1000;
  if (
    (input.riskLevel === 'high' || input.riskLevel === 'critical') &&
    input.requiresApproval === false
  ) {
    throw new Error('High-risk AI action proposals always require human approval.');
  }

  const requiresApproval =
    input.requiresApproval ??
    (input.riskLevel === 'high' ||
      input.riskLevel === 'critical' ||
      input.riskLevel === 'moderate');

  const proposal: AIActionProposal = {
    proposalId: createId('prop'),
    originatingRequestId: input.originatingRequestId,
    correlationId: input.correlationId,
    sessionId: input.sessionId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    workflowContext: input.workflowContext,
    toolName: input.toolName,
    toolVersion: input.toolVersion,
    validatedArguments: { ...input.validatedArguments },
    expectedEffect: input.expectedEffect,
    riskLevel: input.riskLevel,
    requiredPermission: input.requiredPermission,
    requiresApproval,
    evidence: input.evidence ? [...input.evidence] : [],
    citations: input.citations ? [...input.citations] : [],
    model: input.model,
    promptVersion: input.promptVersion,
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    rollbackCapable: Boolean(input.rollbackCapable),
    reversibleUntil:
      input.rollbackCapable && input.reversibleWindowMs
        ? new Date(Date.now() + input.reversibleWindowMs).toISOString()
        : undefined,
    state: 'proposed',
    previewSummary: input.previewSummary,
    dataWillChange: [...input.dataWillChange],
    createdAt,
    updatedAt: createdAt,
    ownerUserId: input.ownerUserId,
    ownerRole: input.ownerRole,
  };

  store.set(proposal.proposalId, proposal);
  return clone(proposal);
}

export function getActionProposal(proposalId: string): AIActionProposal | null {
  const found = store.get(proposalId);
  return found ? clone(found) : null;
}

export function listActionProposals(filter?: {
  patientId?: string;
  state?: AiActionProposalState;
  ownerUserId?: string;
}): AIActionProposal[] {
  const all = [...store.values()].map(clone);
  return all.filter((p) => {
    if (filter?.patientId && p.patientId !== filter.patientId) return false;
    if (filter?.state && p.state !== filter.state) return false;
    if (filter?.ownerUserId && p.ownerUserId !== filter.ownerUserId) return false;
    return true;
  });
}

export function transitionActionProposal(
  proposalId: string,
  to: AiActionProposalState,
  patch?: Partial<
    Pick<
      AIActionProposal,
      | 'validatedArguments'
      | 'rejectionReason'
      | 'executionResult'
      | 'errorCode'
      | 'ownerUserId'
      | 'ownerRole'
    >
  >,
): AIActionProposal {
  const current = store.get(proposalId);
  if (!current) {
    throw new Error(`Action proposal ${proposalId} not found`);
  }
  expireIfNeeded(current);
  if (current.state === to) {
    return clone(current);
  }
  if (!canTransitionProposal(current.state, to)) {
    throw new Error(`Illegal proposal transition ${current.state} → ${to}`);
  }
  if (to === 'approved' && current.requiresApproval === false) {
    // still allow
  }
  if (
    (to === 'approved' || to === 'executing') &&
    (current.riskLevel === 'high' || current.riskLevel === 'critical') &&
    current.requiresApproval === false
  ) {
    throw new Error('High-risk proposals cannot execute without approval requirement');
  }

  const next: AIActionProposal = {
    ...current,
    ...patch,
    validatedArguments: patch?.validatedArguments
      ? { ...patch.validatedArguments }
      : current.validatedArguments,
    state: to,
    updatedAt: nowIso(),
  };
  store.set(proposalId, next);
  return clone(next);
}

export function modifyProposalArguments(
  proposalId: string,
  nextArgs: Record<string, unknown>,
  allowedKeys: string[],
): AIActionProposal {
  const current = store.get(proposalId);
  if (!current) throw new Error(`Action proposal ${proposalId} not found`);
  if (isTerminalProposalState(current.state) || current.state === 'executing') {
    throw new Error('Cannot modify a terminal or executing proposal');
  }
  const merged = { ...current.validatedArguments };
  for (const [key, value] of Object.entries(nextArgs)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Parameter "${key}" is not modifiable for this proposal`);
    }
    merged[key] = value;
  }
  return transitionActionProposal(proposalId, 'reviewing', { validatedArguments: merged });
}

export function approveProposal(proposalId: string, actorUserId?: string): AIActionProposal {
  return transitionActionProposal(proposalId, 'approved', {
    ownerUserId: actorUserId,
  });
}

export function rejectProposal(proposalId: string, reason: string): AIActionProposal {
  return transitionActionProposal(proposalId, 'rejected', { rejectionReason: reason });
}

export function executeProposal(
  proposalId: string,
  executor: (proposal: AIActionProposal) => Promise<Record<string, unknown>> | Record<string, unknown>,
): Promise<AIActionProposal> {
  const current = getActionProposal(proposalId);
  if (!current) throw new Error(`Action proposal ${proposalId} not found`);
  if (current.requiresApproval && current.state !== 'approved') {
    throw new Error('Human approval required before execution');
  }
  if (current.state !== 'approved' && current.state !== 'proposed') {
    throw new Error('Proposal must be approved before execution');
  }

  if (current.state === 'proposed' && !current.requiresApproval) {
    transitionActionProposal(proposalId, 'approved');
  }
  transitionActionProposal(proposalId, 'executing');

  return Promise.resolve()
    .then(() => executor(getActionProposal(proposalId)!))
    .then((result) =>
      transitionActionProposal(proposalId, 'completed', { executionResult: result }),
    )
    .catch((error: unknown) =>
      transitionActionProposal(proposalId, 'failed', {
        errorCode: error instanceof Error ? error.name : 'ExecutionError',
        executionResult: {
          message: error instanceof Error ? error.message : String(error),
        },
      }),
    );
}

export function rollbackProposal(proposalId: string): AIActionProposal {
  const current = store.get(proposalId);
  if (!current) throw new Error(`Action proposal ${proposalId} not found`);
  if (!current.rollbackCapable) {
    throw new Error('This proposal is not rollback-capable');
  }
  if (current.state !== 'completed') {
    throw new Error('Only completed proposals can be rolled back');
  }
  if (current.reversibleUntil && Date.parse(current.reversibleUntil) < Date.now()) {
    throw new Error('Rollback window has expired');
  }
  return transitionActionProposal(proposalId, 'rolled_back');
}

export function clearActionProposalStoreForTests(): void {
  store.clear();
}

function expireIfNeeded(proposal: AIActionProposal): void {
  if (isTerminalProposalState(proposal.state)) return;
  if (Date.parse(proposal.expiresAt) < Date.now()) {
    proposal.state = 'expired';
    proposal.updatedAt = nowIso();
    store.set(proposal.proposalId, proposal);
  }
}

function clone(proposal: AIActionProposal): AIActionProposal {
  return {
    ...proposal,
    validatedArguments: { ...proposal.validatedArguments },
    evidence: [...proposal.evidence],
    citations: [...proposal.citations],
    dataWillChange: [...proposal.dataWillChange],
    workflowContext: proposal.workflowContext ? { ...proposal.workflowContext } : undefined,
    executionResult: proposal.executionResult ? { ...proposal.executionResult } : undefined,
  };
}
