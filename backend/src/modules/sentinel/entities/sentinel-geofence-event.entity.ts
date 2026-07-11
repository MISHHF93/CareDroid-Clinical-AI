import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sentinel_geofence_events')
@Index(['unitId', 'occurredAt'])
export class SentinelGeofenceEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  unitId: string;

  @Column({ type: 'varchar', length: 120 })
  fenceId: string;

  @Column({ type: 'varchar', length: 16 })
  transition: string;

  @Column({ type: 'varchar', length: 64 })
  occurredAt: string;

  @CreateDateColumn()
  createdAt: Date;
}
