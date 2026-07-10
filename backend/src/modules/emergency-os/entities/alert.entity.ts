import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('alerts')
@Index(['patientId'])
export class Alert {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
