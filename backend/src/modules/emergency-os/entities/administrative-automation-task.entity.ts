import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('administrative_automation_tasks')
@Index(['organizationId', 'workspaceId', 'status'])
@Index(['organizationId', 'workspaceId', 'updatedAt'])
export class AdministrativeAutomationTaskEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  organizationId: string;

  @Column({ type: 'varchar', length: 120 })
  workspaceId: string;

  @Column({ type: 'varchar', length: 64 })
  category: string;

  @Column({ type: 'varchar', length: 32, default: 'pending_review' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'medium' })
  priority: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  @Column({ type: 'simple-json' })
  task: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
