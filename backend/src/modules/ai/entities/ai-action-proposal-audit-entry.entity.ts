import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Backend reliability roadmap item — hash-chain audit per proposal transition.
 *
 * Append-only, one row per state transition (including creation). Each row's
 * `entryHash` covers its own fields plus the prior row's `entryHash`, so any
 * edit to a stored row (or removal of one from the middle of the chain)
 * breaks the chain from that point forward — detectable by
 * `AiActionProposalService.verifyAuditChain()` without needing a separate
 * signing key. This is a tamper-evidence log, not access control: it proves
 * the recorded transition history hasn't been silently altered after the
 * fact, on top of (not instead of) the `ALLOWED` state-machine guard that
 * already prevents illegal transitions from happening in the first place.
 */
@Entity('ai_action_proposal_audit_entries')
@Index(['proposalId', 'sequenceIndex'], { unique: true })
export class AIActionProposalAuditEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  proposalId: string;

  /** 0-based, per proposal. Entry 0 is the creation event (fromState is null). */
  @Column({ type: 'int' })
  sequenceIndex: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fromState: string | null;

  @Column({ type: 'varchar', length: 20 })
  toState: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 32 })
  occurredAt: string;

  /** Small transition-specific context (e.g. rejectionReason, errorCode), JSON-serialized. */
  @Column({ type: 'text', nullable: true })
  metadataJson: string | null;

  /** entryHash of the previous entry in this proposal's chain; null for entry 0 (genesis). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  previousHash: string | null;

  /** sha256 hex of this entry's own fields + previousHash. */
  @Column({ type: 'varchar', length: 64 })
  entryHash: string;
}
