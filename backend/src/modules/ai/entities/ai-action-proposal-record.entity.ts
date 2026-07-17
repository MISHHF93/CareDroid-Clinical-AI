import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * IX16 — durable record for server-side AI action proposals.
 *
 * The synchronous in-process store in `AiActionProposalService` remains the
 * read model; this table is its write-through journal so proposals survive a
 * process restart (hydrated on module init). The full proposal is stored as a
 * JSON payload so the evolving `ServerAiActionProposal` shape never needs a
 * schema migration; only identity/scoping/state are real columns for indexing.
 */
@Entity('ai_action_proposals')
@Index(['organizationId', 'state'])
@Index(['updatedAt'])
export class AIActionProposalRecord {
  /** Matches ServerAiActionProposal.proposalId (uuid string). */
  @PrimaryColumn({ type: 'varchar', length: 36 })
  proposalId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 20 })
  state: string;

  /** ISO string, mirrored from the payload for cheap ordering/pruning. */
  @Column({ type: 'varchar', length: 32 })
  updatedAt: string;

  /** Full ServerAiActionProposal, JSON-serialized. */
  @Column({ type: 'text' })
  payload: string;
}
