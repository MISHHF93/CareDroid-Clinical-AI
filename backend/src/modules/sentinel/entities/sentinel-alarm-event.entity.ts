import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sentinel_alarm_events')
@Index(['alarmId', 'occurredAt'])
export class SentinelAlarmEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  alarmId: string;

  @Column({ type: 'varchar', length: 32 })
  action: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actorRole: string | null;

  @Column({ type: 'varchar', length: 64 })
  occurredAt: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
