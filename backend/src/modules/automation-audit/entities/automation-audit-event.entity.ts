import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AutomationAuditStatus {
  SUCCESS = 'success',
  BLOCKED = 'blocked',
  FAILED = 'failed',
}

export interface AutomationAuditCondition {
  label: string;
  result: boolean;
}

@Entity('automation_audit_events')
@Index(['tenantId', 'timestamp'])
@Index(['status', 'timestamp'])
export class AutomationAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  triggerFired: string;

  @Column({ type: 'simple-json' })
  conditionsEvaluated: AutomationAuditCondition[];

  @Column({ type: 'varchar', length: 255 })
  actionSelected: string;

  @Column({ type: 'varchar', length: 120 })
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  userName: string;

  @Column({ type: 'varchar', length: 120 })
  tenantId: string;

  @Column({ type: 'varchar', length: 200 })
  tenantName: string;

  @Column({ type: 'varchar', length: 120 })
  workspaceId: string;

  @Column({ type: 'varchar', length: 200 })
  workspaceName: string;

  @Column({ type: 'boolean', default: false })
  aiInvolved: boolean;

  @Column({ type: 'text', nullable: true })
  aiSummary: string;

  @Column({ type: 'varchar', length: 160 })
  toolCalled: string;

  @Column({ type: 'varchar', length: 255 })
  backendEndpoint: string;

  @Column({ type: 'varchar', enum: AutomationAuditStatus })
  status: AutomationAuditStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: Date })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  reviewerRequired: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reviewerName: string;

  @CreateDateColumn()
  createdAt: Date;
}
