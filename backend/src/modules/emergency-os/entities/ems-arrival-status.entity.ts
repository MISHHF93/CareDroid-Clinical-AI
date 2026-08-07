import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Durable EMS arrival status transitions (Inbound -> Arrived -> Handoff -> Complete).
 * Before this entity, EMSIntakeService.getEMSIntake() synthesized every arrival fresh
 * from patient records on every request with no tracked transition state at all -- the
 * offload clock (arrivedAt/handoffStartedAt/handoffCompletedAt) lived only in each
 * browser tab's local store, so it reset on reload and diverged across workstations.
 */
@Entity('ems_arrival_status')
@Index(['patientId'])
export class EmsArrivalStatus {
  /** The same arrivalId the frontend already uses (e.g. `ems-arrival-<patientId>`) -- opaque, not generated here. */
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  unitId?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  unitName?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  arrivedAt?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  handoffStartedAt?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  handoffCompletedAt?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
