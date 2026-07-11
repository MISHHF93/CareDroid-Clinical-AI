import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sentinel_positions')
@Index(['unitId', 'receivedAt'])
@Index(['unitId', 'eventSeq'])
export class SentinelPositionEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  unitId: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  heading: number | null;

  @Column({ type: 'float', nullable: true })
  speedKmh: number | null;

  @Column({ type: 'varchar', length: 64 })
  source: string;

  @Column({ type: 'varchar', length: 64 })
  receivedAt: string;

  @Column({ type: 'integer', default: 0 })
  eventSeq: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sourceEventId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
