import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { UsageEventType, UsageUnit } from '../subscription-plans.config';

@Entity('usage_events')
@Index(['organizationId', 'occurredAt'])
@Index(['organizationId', 'workspaceId', 'occurredAt'])
@Index(['organizationId', 'assetId', 'occurredAt'])
@Index(['organizationId', 'eventType', 'occurredAt'])
@Index(['organizationId', 'meterId', 'occurredAt'])
@Index(['organizationId', 'idempotencyKey'], { unique: true })
export class UsageEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  organizationId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userRole: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  assetId: string | null;

  @Column({ type: 'varchar', enum: UsageEventType })
  eventType: UsageEventType;

  @Column({ type: 'varchar', length: 80, nullable: true })
  meterId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'float', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 30 })
  unit: UsageUnit;

  @Column({ type: Date })
  periodStart: Date;

  @Column({ type: Date })
  periodEnd: Date;

  @Column({ type: Date })
  occurredAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: Record<string, any> | null | undefined) => (value ? JSON.stringify(value) : null),
      from: (value: string | null) => (value ? JSON.parse(value) : null),
    },
  })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
