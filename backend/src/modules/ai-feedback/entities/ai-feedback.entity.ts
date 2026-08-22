import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * User feedback on one AI-generated response (item 11). Deliberately a
 * SEPARATE table from `ai_queries` (the real per-interaction traceability
 * record, `backend/src/modules/ai/entities/ai-query.entity.ts`) and from
 * `qa/ai-eval/results/*.json` (the offline safety-eval harness) -- this is
 * subjective human sentiment about one response, never a measured accuracy
 * signal. Nothing in this codebase may aggregate `rating` into an accuracy
 * metric; a thumbs-up is not evidence a response was correct, only that a
 * user found it useful.
 *
 * Correlated by `runId` (the AI gateway's own `GatewayRunEnvelope.runId`,
 * already returned to the client on every response and used for
 * observability correlation elsewhere) rather than `ai_queries.id`, since
 * `AIService.logQuery()` does not currently return its saved row id to the
 * caller -- joining on `runId` is the real, already-reachable correlation
 * key without changing that unrelated, more central code path.
 */
@Entity('ai_feedback')
@Index(['runId'])
@Index(['organizationId', 'createdAt'])
export class AiFeedbackEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  runId: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  capabilityId?: string;

  @Column({ type: 'varchar', length: 120 })
  userId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId?: string;

  /** 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT' | 'OUTDATED' | 'UNSAFE_CONCERN' | 'OTHER' */
  @Column({ type: 'varchar', length: 20 })
  rating: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;
}
