import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('alerts')
@Index(['patientId'])
@Index(['organizationId'])
export class Alert {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  /** See patient.entity.ts's `organizationId` doc comment for the nullable/legacy-row rationale. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 16 })
  severity: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  /** The alert's own business timestamp (ISO string), distinct from the DB audit `createdAt` below. */
  @Column({ type: 'varchar', length: 64 })
  dispatchedAt: string;

  @Column({ type: 'boolean', default: false })
  dismissed: boolean;

  /** The role this alert is actually meant for (e.g. 'physician'), nullable/legacy-row-safe like organizationId above. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  ownerRole?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
