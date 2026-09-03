import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CollaborationChannelType {
  DEPARTMENT = 'department',
  PATIENT_THREAD = 'patient_thread',
  INCIDENT = 'incident',
  DIRECT_MESSAGE = 'direct_message',
  AI_CHIEF = 'ai_chief',
  ANNOUNCEMENT = 'announcement',
}

export enum CollaborationChannelStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/** Fixed operational department channels seeded per organization. */
export enum CollaborationDepartmentKey {
  EMERGENCY_DEPARTMENT = 'emergency_department',
  RECEPTION = 'reception',
  TRIAGE = 'triage',
  EMS = 'ems',
  CHARGE_NURSES = 'charge_nurses',
  PHYSICIANS = 'physicians',
  LABORATORY = 'laboratory',
  RADIOLOGY = 'radiology',
  PHARMACY = 'pharmacy',
  PATIENT_FLOW = 'patient_flow',
  HOSPITAL_OPERATIONS = 'hospital_operations',
  ADMINISTRATION = 'administration',
  IT_OPERATIONS = 'it_operations',
  QUALITY_SAFETY = 'quality_safety',
  INCIDENT_RESPONSE = 'incident_response',
}

@Entity('collaboration_channels')
@Index(['organizationId', 'type'])
@Index(['organizationId', 'departmentKey'])
@Index(['patientId'])
export class CollaborationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * varchar rather than a strict uuid column: most flows stamp a real
   * Organization UUID here (from req.tenantContext.organizationId), but a few
   * best-effort background hooks (emergency escalation, clinical-alerts sync,
   * workflow-log sync) fall back to a 'default-organization'/'default-tenant'
   * style sentinel when no tenant context is available yet, mirroring the
   * existing WorkflowActionLogService.record() convention.
   */
  @Column({ type: 'varchar', length: 64 })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', enum: CollaborationChannelType })
  type: CollaborationChannelType;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  departmentKey: CollaborationDepartmentKey | null;

  /**
   * Loose cross-store reference only. Patient records live in Mongoose
   * (UnifiedPatient, ObjectId) while this entity is TypeORM — no FK is
   * possible across that boundary. See docs/data-model/data-model-reference.md.
   */
  @Column({ type: 'varchar', length: 96, nullable: true })
  patientId: string | null;

  @Column({
    type: 'varchar',
    enum: CollaborationChannelStatus,
    default: CollaborationChannelStatus.ACTIVE,
  })
  status: CollaborationChannelStatus;

  /** True for department/patient-thread/AI-chief channels the platform creates automatically. */
  @Column({ type: 'boolean', default: false })
  isSystemManaged: boolean;

  @Column({ type: 'varchar', length: 40, nullable: true })
  incidentSeverity: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  incidentTriggerType: string | null;

  @Column({ type: 'varchar', length: 96, nullable: true })
  incidentSourceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'int', nullable: true })
  retentionPolicyDays: number | null;

  @Column({ type: Date, nullable: true })
  archivedAt: Date | null;

  @Column({ type: Date, nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
