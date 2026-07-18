import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Write-through journal for `WorkflowActionLogService` (Cycle 92).
 *
 * The in-process buffer in `WorkflowActionLogService` remains the read model;
 * this table lets it survive a process restart (rehydrated on module init),
 * closing the same class of gap Cycle 77 closed for AI action proposals.
 * EMS handoff completion (`completeHandoff` -> `record()`) is one of ~18
 * call sites through this single already-centralized service, so durability
 * added here closes the gap for all workflow log types, not just EMS.
 * Full log entry stored as JSON so the evolving `WorkflowActionLog` shape
 * never needs a schema migration; only identity/scoping fields are real
 * columns for indexing.
 */
@Entity('workflow_action_logs')
@Index(['tenantId', 'timestamp'])
@Index(['patientId'])
export class WorkflowActionLogEntry {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  patientId: string | null;

  @Column({ type: 'varchar', length: 48 })
  type: string;

  /** ISO string, mirrored from the payload for cheap ordering/pruning. */
  @Column({ type: 'varchar', length: 32 })
  timestamp: string;

  /** Full WorkflowActionLog, JSON-serialized. */
  @Column({ type: 'text' })
  payload: string;
}
