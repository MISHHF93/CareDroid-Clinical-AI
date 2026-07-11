import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sentinel_ems_episodes')
@Index(['unitId', 'status'])
export class SentinelEpisodeEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  unitId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  inboundPatientId: string | null;

  @Column({ type: 'varchar', length: 32, default: 'dispatched' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  dispatchedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  onSceneAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  enRouteHospitalAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  arrivedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  handoffStartedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  handoffCompletedAt: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  unitAvailableAt: string | null;

  @Column({ type: 'integer', nullable: true })
  predictedEtaMin: number | null;

  @Column({ type: 'integer', nullable: true })
  actualTravelMin: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
