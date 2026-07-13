import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sentinel_alarms')
@Index(['status', 'severity'])
@Index(['fingerprint'])
@Index(['subjectId', 'status'])
export class SentinelAlarmEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 80 })
  fingerprint: string;

  @Column({ type: 'varchar', length: 64 })
  source: string;

  @Column({ type: 'varchar', length: 64 })
  category: string;

  @Column({ type: 'varchar', length: 64 })
  ruleId: string;

  @Column({ type: 'varchar', length: 120 })
  subjectId: string;

  @Column({ type: 'varchar', length: 16 })
  severity: string;

  @Column({ type: 'varchar', length: 16 })
  urgency: string;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 64 })
  createdAtIso: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  acknowledgedAt: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  acknowledgedBy: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  escalatedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resolvedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  dismissedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  expiredAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  suppressUntil: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
