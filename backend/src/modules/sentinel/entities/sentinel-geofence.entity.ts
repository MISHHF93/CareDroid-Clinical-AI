import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sentinel_geofences')
@Index(['organizationId', 'kind'])
export class SentinelGeofenceEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  kind: string;

  /** JSON array of { latitude, longitude } — PostGIS optional later. */
  @Column({ type: 'simple-json' })
  ring: Array<{ latitude: number; longitude: number }>;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
