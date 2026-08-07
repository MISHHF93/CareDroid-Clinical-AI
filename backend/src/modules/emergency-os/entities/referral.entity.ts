import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('referrals')
@Index(['patientId'])
export class Referral {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  patientId: string;

  @Column({ type: 'varchar', length: 120 })
  requestingStaffId: string;

  @Column({ type: 'varchar', length: 120 })
  targetDepartment: string;

  @Column({ type: 'varchar', length: 120 })
  specialty: string;

  @Column({ type: 'varchar', length: 32 })
  urgency: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text' })
  clinicalSummary: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 64 })
  workflow: string;

  /** The referral's own business timestamp (ISO string), distinct from the DB audit `createdAt` below. */
  @Column({ type: 'varchar', length: 64 })
  requestedAt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  statusUpdatedAt?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
