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

import { Injectable, BadRequestException, Logger, NotFoundException, Optional } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, createHash } from 'crypto';
import { AIActionProposalRecord } from './entities/ai-action-proposal-record.entity';
import { AIActionProposalAuditEntry } from './entities/ai-action-proposal-audit-entry.entity';

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

export interface AiActionProposalAuditEntryView {
  proposalId: string;
  sequenceIndex: number;
  fromState: AiActionProposalState | null;
  toState: AiActionProposalState;
  actorUserId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  previousHash: string | null;
  entryHash: string;
}

export interface AuditChainVerification {
  valid: boolean;
  entryCount: number;
  brokenAtSequenceIndex?: number;
}

/**
 * Pure so the exact same computation used to append an entry is used to
 * verify one — a verifier that recomputes hashes with slightly different
 * logic than the writer would silently accept tampering.
 */
function computeAuditEntryHash(entry: {
  proposalId: string;
  sequenceIndex: number;
  fromState: string | null;
  toState: string;
  actorUserId: string | null;
  occurredAt: string;
  metadataJson: string | null;
  previousHash: string | null;
}): string {
  const canonical = [
    entry.proposalId,
    entry.sequenceIndex,
    entry.fromState ?? '',
    entry.toState,
    entry.actorUserId ?? '',
    entry.occurredAt,
    entry.metadataJson ?? '',
    entry.previousHash ?? '',
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex');
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
  private readonly logger = new Logger(AiActionProposalService.name);
  private readonly store = new Map<string, ServerAiActionProposal>();
  /** Ordered audit trail per proposal — the in-process read model for the hash chain. */
  private readonly auditTrails = new Map<string, AiActionProposalAuditEntryView[]>();

  constructor(
    @Optional()
    @InjectRepository(AIActionProposalRecord)
    private readonly journal?: Repository<AIActionProposalRecord>,
    @Optional()
    @InjectRepository(AIActionProposalAuditEntry)
    private readonly auditLog?: Repository<AIActionProposalAuditEntry>,
  ) {}

  /** Rehydrate the in-process read model from the durable journal. */
  async onModuleInit(): Promise<void> {
    if (this.journal) {
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

    if (this.auditLog) {
      try {
        const rows = await this.auditLog.find({
          order: { proposalId: 'ASC', sequenceIndex: 'ASC' },
        });
        for (const row of rows) {
          const trail = this.auditTrails.get(row.proposalId) || [];
          trail.push({
            proposalId: row.proposalId,
            sequenceIndex: row.sequenceIndex,
            fromState: (row.fromState as AiActionProposalState | null) ?? null,
            toState: row.toState as AiActionProposalState,
            actorUserId: row.actorUserId ?? undefined,
            occurredAt: row.occurredAt,
            metadata: row.metadataJson ? JSON.parse(row.metadataJson) : undefined,
            previousHash: row.previousHash,
            entryHash: row.entryHash,
          });
          this.auditTrails.set(row.proposalId, trail);
        }
      } catch {
        // Audit log unavailable (e.g. migrations not run yet): chains start fresh.
      }
    }
  }

  /** Append one entry to a proposal's hash chain; fire-and-forget durable write, same contract as `persist()`. */
  private appendAuditEntry(
    proposalId: string,
    fromState: AiActionProposalState | null,
    toState: AiActionProposalState,
    actorUserId: string | undefined,
    metadata: Record<string, unknown> | undefined,
  ): void {
    const trail = this.auditTrails.get(proposalId) || [];
    const previous = trail.length ? trail[trail.length - 1] : undefined;
    const sequenceIndex = trail.length;
    const occurredAt = new Date().toISOString();
    const hasMetadata = Boolean(metadata && Object.keys(metadata).length);
    const metadataJson = hasMetadata ? JSON.stringify(metadata) : null;
    const previousHash = previous ? previous.entryHash : null;
    const entryHash = computeAuditEntryHash({
      proposalId,
      sequenceIndex,
      fromState,
      toState,
      actorUserId: actorUserId ?? null,
      occurredAt,
      metadataJson,
      previousHash,
    });

    const entry: AiActionProposalAuditEntryView = {
      proposalId,
      sequenceIndex,
      fromState,
      toState,
      actorUserId,
      occurredAt,
      metadata: hasMetadata ? metadata : undefined,
      previousHash,
      entryHash,
    };
    trail.push(entry);
    this.auditTrails.set(proposalId, trail);

    if (!this.auditLog) return;
    void this.auditLog
      .save({
        proposalId,
        sequenceIndex,
        fromState,
        toState,
        actorUserId: actorUserId ?? null,
        occurredAt,
        metadataJson,
        previousHash,
        entryHash,
      } as AIActionProposalAuditEntry)
      .catch((error) => {
        // HEAL-251: this write-through is the durable half of the hash
        // chain -- verifyAuditChain() re-derives trust from this table
        // after a restart. A silently dropped write here left a gap the
        // in-process auditTrails map wouldn't reveal until the next
        // restart or cross-instance read.
        this.logger.error(
          `Failed to persist audit entry for proposal ${proposalId} (sequence ${sequenceIndex})`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  /** Full ordered audit trail for a proposal (empty array if none/unknown). */
  getAuditTrail(proposalId: string): AiActionProposalAuditEntryView[] {
    return (this.auditTrails.get(proposalId) || []).map((entry) => ({ ...entry }));
  }

  /**
   * Recomputes every entry's hash from its own stored fields and the
   * previous entry's hash, comparing against the stored `entryHash`. Any
   * edited field or removed/reordered entry breaks the chain from that
   * point forward.
   */
  verifyAuditChain(proposalId: string): AuditChainVerification {
    const trail = this.auditTrails.get(proposalId) || [];
    let previousHash: string | null = null;
    for (const entry of trail) {
      const expected = computeAuditEntryHash({
        proposalId: entry.proposalId,
        sequenceIndex: entry.sequenceIndex,
        fromState: entry.fromState,
        toState: entry.toState,
        actorUserId: entry.actorUserId ?? null,
        occurredAt: entry.occurredAt,
        metadataJson:
          entry.metadata && Object.keys(entry.metadata).length
            ? JSON.stringify(entry.metadata)
            : null,
        previousHash,
      });
      if (expected !== entry.entryHash || entry.previousHash !== previousHash) {
        return {
          valid: false,
          entryCount: trail.length,
          brokenAtSequenceIndex: entry.sequenceIndex,
        };
      }
      previousHash = entry.entryHash;
    }
    return { valid: true, entryCount: trail.length };
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
      .catch((error) => {
        // HEAL-251: this docstring has always claimed a journal failure is
        // logged here -- the catch body did nothing. A dropped write meant
        // this AI action proposal wouldn't survive a process restart, with
        // no trace anywhere that it happened.
        this.logger.error(
          `Failed to persist AI action proposal ${proposal.proposalId} (state ${proposal.state})`,
          error instanceof Error ? error.stack : String(error),
        );
      });
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
    this.appendAuditEntry(
      proposal.proposalId,
      null,
      proposal.state,
      proposal.ownerUserId,
      undefined,
    );
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
    this.appendAuditEntry(proposalId, current.state, to, patch?.ownerUserId, {
      ...(patch?.rejectionReason ? { rejectionReason: patch.rejectionReason } : {}),
      ...(patch?.errorCode ? { errorCode: patch.errorCode } : {}),
    });
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
    this.auditTrails.clear();
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
      const fromState = proposal.state;
      proposal.state = 'expired';
      proposal.updatedAt = new Date().toISOString();
      this.store.set(proposal.proposalId, proposal);
      this.persist(proposal);
      this.appendAuditEntry(proposal.proposalId, fromState, 'expired', undefined, undefined);
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
