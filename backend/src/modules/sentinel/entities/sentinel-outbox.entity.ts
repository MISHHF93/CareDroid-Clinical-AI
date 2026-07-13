import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sentinel_outbox')
@Index(['status', 'availableAt'])
export class SentinelOutboxEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  aggregateType: string;

  @Column({ type: 'varchar', length: 120 })
  aggregateId: string;

  @Column({ type: 'varchar', length: 64 })
  eventType: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 64 })
  availableAt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  publishedAt: string | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
