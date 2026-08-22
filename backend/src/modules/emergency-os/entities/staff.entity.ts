import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('staff')
export class Staff {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  /** See Patient.organizationId for the nullable/legacy-row rationale --
   * same pattern, seeded/fixture staff rows predate this column. */
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  role: string;

  @Column({ type: 'boolean' })
  active: boolean;

  /**
   * Real "who is on shift right now" data -- see scorecard roadmap item G1.
   * Before this, no staff row anywhere in the app had an email or a runtime-
   * readable on-duty flag, so waiting-room-safety escalation could only ever
   * email a static, empty-by-default distribution list, never a specific
   * on-duty person. Nullable/default-false because populating this is an
   * ops/admin action (PATCH /api/emergency/staff/:id/duty-status), not
   * something this migration can infer.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: false })
  onDuty: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
