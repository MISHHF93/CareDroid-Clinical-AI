import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sentinel_units')
@Index(['organizationId', 'status'])
@Index(['externalId', 'vendorId'], { unique: true })
export class SentinelUnitEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  externalId: string;

  @Column({ type: 'varchar', length: 64, default: 'mock' })
  vendorId: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 16, default: 'ALS' })
  unitType: string;

  @Column({ type: 'varchar', length: 32, default: 'available' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'offline' })
  freshness: string;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'float', nullable: true })
  heading: number | null;

  @Column({ type: 'float', nullable: true })
  speedKmh: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastSeenAt: string | null;

  @Column({ type: 'integer', default: 0 })
  lastEventSeq: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  workspaceId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
