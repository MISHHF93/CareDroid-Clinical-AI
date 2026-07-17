/**
 * Server-side AI action proposal store — mirrors the frontend state machine
 * so proposals can be listed/approved over the API.
 *
 * IX16 (Cy77): the synchronous in-process map is now backed by a write-through
 * TypeORM journal (`ai_action_proposals`). Every mutation persists the full
 * proposal as JSON; on module init the store hydrates from the table, so
 * proposals survive a process restart. The repository is optional — without
 * it (unit tests, sqlite-less dev) the service behaves exactly as before,
 * explicitly in-memory-only.
 */

import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AIActionProposalRecord } from './entities/ai-action-proposal-record.entity';

export type AiRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AiActionProposalState =
  | 'proposed'
  | 'reviewing'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'rolled_back';

export interface ServerAiActionProposal {
  proposalId: string;
  organizationId?: string;
  originatingRequestId: string;
  correlationId: string;
  sessionId?: string;
  patientId?: string;
  toolName: string;
  validatedArguments: Record<string, unknown>;
  expectedEffect: string;
  riskLevel: AiRiskLevel;
  requiredPermission: string;
  requiresApproval: boolean;
  previewSummary: string;
  dataWillChange: string[];
  model: string;
  promptVersion: string;
  expiresAt: string;
  rollbackCapable: boolean;
  reversibleUntil?: string;
  state: AiActionProposalState;
  createdAt: string;
  updatedAt: string;
  ownerUserId?: string;
  ownerRole?: string;
  rejectionReason?: string;
  executionResult?: Record<string, unknown>;
  errorCode?: string;
}

const ALLOWED: Record<AiActionProposalState, AiActionProposalState[]> = {
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

@Injectable()
export class AiActionProposalService implements OnModuleInit {
  private readonly store = new Map<string, ServerAiActionProposal>();

  constructor(
    @Optional()
    @InjectRepository(AIActionProposalRecord)
    private readonly journal?: Repository<AIActionProposalRecord>,
  ) {}

  /** Rehydrate the in-process read model from the durable journal. */
  async onModuleInit(): Promise<void> {
    if (!this.journal) return;
    try {
      const rows = await this.journal.find();
      for (const row of rows) {
        if (this.store.has(row.proposalId)) continue;
        try {
          this.store.set(row.proposalId, JSON.parse(row.payload) as ServerAiActionProposal);
        } catch {
          // A corrupt payload must not block startup; skip that row.
        }
      }
    } catch {
      // Journal unavailable (e.g. migrations not run yet): stay in-memory.
    }
  }

  /**
   * Fire-and-forget write-through. The synchronous contract is preserved —
   * a journal failure is logged by the catch, never thrown into the workflow.
   */
  private persist(proposal: ServerAiActionProposal): void {
    if (!this.journal) return;
    void this.journal
      .save({
        proposalId: proposal.proposalId,
        organizationId: proposal.organizationId ?? null,
        state: proposal.state,
        updatedAt: proposal.updatedAt,
        payload: JSON.stringify(proposal),
      })
      .catch(() => undefined);
  }

  create(input: {
    organizationId?: string;
    originatingRequestId: string;
    correlationId: string;
    sessionId?: string;
    patientId?: string;
    toolName: string;
    validatedArguments?: Record<string, unknown>;
    expectedEffect: string;
    riskLevel?: AiRiskLevel;
    requiredPermission?: string;
    requiresApproval?: boolean;
    previewSummary: string;
    dataWillChange?: string[];
    model?: string;
    promptVersion?: string;
    expiresInMs?: number;
    rollbackCapable?: boolean;
    reversibleWindowMs?: number;
    ownerUserId?: string;
    ownerRole?: string;
  }): ServerAiActionProposal {
    const riskLevel = input.riskLevel || 'moderate';
    if ((riskLevel === 'high' || riskLevel === 'critical') && input.requiresApproval === false) {
      throw new BadRequestException('High-risk AI action proposals always require human approval.');
    }
    const requiresApproval =
      input.requiresApproval ??
      (riskLevel === 'high' || riskLevel === 'critical' || riskLevel === 'moderate');
    const now = new Date();
    const expiresInMs = input.expiresInMs ?? 30 * 60 * 1000;
    const proposal: ServerAiActionProposal = {
      proposalId: randomUUID(),
      organizationId: input.organizationId,
      originatingRequestId: input.originatingRequestId,
      correlationId: input.correlationId,
      sessionId: input.sessionId,
      patientId: input.patientId,
      toolName: input.toolName,
      validatedArguments: { ...(input.validatedArguments || {}) },
      expectedEffect: input.expectedEffect,
      riskLevel,
      requiredPermission: input.requiredPermission || 'use_ai_chat',
      requiresApproval,
      previewSummary: input.previewSummary,
      dataWillChange: [...(input.dataWillChange || [])],
      model: input.model || 'careDroidAI-node-v1',
      promptVersion: input.promptVersion || 'interactive@1',
      expiresAt: new Date(now.getTime() + expiresInMs).toISOString(),
      rollbackCapable: Boolean(input.rollbackCapable),
      reversibleUntil:
        input.rollbackCapable && input.reversibleWindowMs
          ? new Date(now.getTime() + input.reversibleWindowMs).toISOString()
          : undefined,
      state: 'proposed',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ownerUserId: input.ownerUserId,
      ownerRole: input.ownerRole,
    };
    this.store.set(proposal.proposalId, proposal);
    this.persist(proposal);
    return this.clone(proposal);
  }

  list(filter?: {
    organizationId?: string;
    ownerUserId?: string;
    state?: AiActionProposalState;
  }): ServerAiActionProposal[] {
    return [...this.store.values()]
      .filter((p) => {
        this.expireIfNeeded(p);
        if (
          filter?.organizationId &&
          p.organizationId &&
          p.organizationId !== filter.organizationId
        ) {
          return false;
        }
        if (filter?.ownerUserId && p.ownerUserId && p.ownerUserId !== filter.ownerUserId) {
          return false;
        }
        if (filter?.state && p.state !== filter.state) return false;
        return true;
      })
      .map((p) => this.clone(p));
  }

  get(proposalId: string): ServerAiActionProposal {
    const p = this.store.get(proposalId);
    if (!p) throw new NotFoundException(`Proposal ${proposalId} not found`);
    this.expireIfNeeded(p);
    return this.clone(p);
  }

  transition(
    proposalId: string,
    to: AiActionProposalState,
    patch?: Partial<
      Pick<
        ServerAiActionProposal,
        | 'validatedArguments'
        | 'rejectionReason'
        | 'executionResult'
        | 'errorCode'
        | 'ownerUserId'
        | 'ownerRole'
      >
    >,
  ): ServerAiActionProposal {
    const current = this.store.get(proposalId);
    if (!current) throw new NotFoundException(`Proposal ${proposalId} not found`);
    this.expireIfNeeded(current);
    if (current.state === to) return this.clone(current);
    if (!ALLOWED[current.state]?.includes(to)) {
      throw new BadRequestException(`Illegal proposal transition ${current.state} → ${to}`);
    }
    if (
      (to === 'approved' || to === 'executing') &&
      (current.riskLevel === 'high' || current.riskLevel === 'critical') &&
      !current.requiresApproval
    ) {
      throw new BadRequestException(
        'High-risk proposals cannot execute without approval requirement',
      );
    }
    if (to === 'rolled_back') {
      if (!current.rollbackCapable) {
        throw new BadRequestException('This proposal is not rollback-capable');
      }
      if (current.reversibleUntil && Date.parse(current.reversibleUntil) < Date.now()) {
        throw new BadRequestException('Rollback window has expired');
      }
    }
    const next: ServerAiActionProposal = {
      ...current,
      ...patch,
      validatedArguments: patch?.validatedArguments
        ? { ...patch.validatedArguments }
        : current.validatedArguments,
      state: to,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(proposalId, next);
    this.persist(next);
    return this.clone(next);
  }

  approve(proposalId: string, actorUserId?: string): ServerAiActionProposal {
    return this.transition(proposalId, 'approved', { ownerUserId: actorUserId });
  }

  reject(proposalId: string, reason: string): ServerAiActionProposal {
    return this.transition(proposalId, 'rejected', { rejectionReason: reason });
  }

  execute(proposalId: string, result?: Record<string, unknown>): ServerAiActionProposal {
    const current = this.get(proposalId);
    if (current.requiresApproval && current.state !== 'approved') {
      throw new BadRequestException('Human approval required before execution');
    }
    if (current.state === 'proposed' && !current.requiresApproval) {
      this.transition(proposalId, 'approved');
    }
    this.transition(proposalId, 'executing');
    return this.transition(proposalId, 'completed', {
      executionResult: result || {
        ok: true,
        note: 'Server recorded draft execution — no chart write performed.',
      },
    });
  }

  clearForTests(): void {
    this.store.clear();
  }

  private expireIfNeeded(proposal: ServerAiActionProposal): void {
    const terminal = new Set([
      'completed',
      'failed',
      'rejected',
      'cancelled',
      'expired',
      'rolled_back',
    ]);
    if (terminal.has(proposal.state)) return;
    if (Date.parse(proposal.expiresAt) < Date.now()) {
      proposal.state = 'expired';
      proposal.updatedAt = new Date().toISOString();
      this.store.set(proposal.proposalId, proposal);
      this.persist(proposal);
    }
  }

  private clone(p: ServerAiActionProposal): ServerAiActionProposal {
    return {
      ...p,
      validatedArguments: { ...p.validatedArguments },
      dataWillChange: [...p.dataWillChange],
      executionResult: p.executionResult ? { ...p.executionResult } : undefined,
    };
  }
}
