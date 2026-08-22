import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * A single unit of outstanding operational work in the Care Operations
 * Inbox (registration exceptions, reassessment-due, EMS handoff-pending).
 * This is the first backend-persisted closed-loop task lifecycle in the
 * codebase -- see CareOperationsService for the OPEN -> ACKNOWLEDGED ->
 * IN_PROGRESS -> COMPLETED/CANCELLED/EXPIRED state machine. Every row is
 * always org-scoped from creation (no legacy unscoped rows possible, unlike
 * `alerts`/`patients`), so reads simply filter on organizationId.
 */
@Entity('care_tasks')
@Index(['organizationId'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'dedupeKey'])
export class CareTaskEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  organizationId: string;

  /** 'reassessment_due' | 'ems_handoff_pending' | 'operational_exception' */
  @Column({ type: 'varchar', length: 40 })
  taskType: string;

  /** 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' */
  @Column({ type: 'varchar', length: 20 })
  status: string;

  /** 'Info' | 'Warning' | 'Critical' -- same vocabulary as Alert.severity. */
  @Column({ type: 'varchar', length: 16 })
  priority: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  ownerRole?: string;

  /** Claimed by, once acknowledged. Distinct from ownerRole (item 3: role bucket vs actual owner). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  ownerUserId?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  encounterId?: string;

  @Column({ type: 'text' })
  reason: string;

  /** e.g. 'reassessment.due.scan', 'ems.handoff.pending.scan', 'reception.escalation'. */
  @Column({ type: 'varchar', length: 80 })
  sourceEvent: string;

  /** Idempotency key for the pull-based reconciler: `${taskType}:${naturalId}`. */
  @Column({ type: 'varchar', length: 160 })
  dedupeKey: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  deepLink?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  dueAt?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  acknowledgedAt?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  acknowledgedBy?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  completedAt?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  completedBy?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  cancelledAt?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cancelledBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
