import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTRATION = 'registration',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_VERIFICATION = 'email_verification',
  TWO_FACTOR_ENABLE = 'two_factor_enable',
  TWO_FACTOR_DISABLE = 'two_factor_disable',
  TWO_FACTOR_VERIFY = 'two_factor_verify',
  TWO_FACTOR_VERIFY_FAILED = 'two_factor_verify_failed',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  PHI_ACCESS = 'phi_access',
  AI_QUERY = 'ai_query',
  CLINICAL_DATA_ACCESS = 'clinical_data_access',
  SECURITY_EVENT = 'security_event',
  PROFILE_UPDATE = 'profile_update',
  MEMORY_READ = 'memory_read',
  MEMORY_WRITE = 'memory_write',
  EMERGENCY_ACCESS_SUCCESS = 'emergency_access_success',
  EMERGENCY_ACCESS_FAILED = 'emergency_access_failed',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_ARCHIVED = 'channel_archived',
  MENTION_CREATED = 'mention_created',
}

@Entity('audit_logs')
@Index(['userId', 'timestamp'])
@Index(['phiAccessed', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string;

  @Column({ type: 'uuid', nullable: true })
  targetUserId: string;

  @Column({ type: 'uuid', nullable: true })
  membershipId: string;

  @Column({ type: 'varchar', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'varchar', length: 255 })
  resource: string;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string; // Will be encrypted at rest

  @Column({ type: 'text', nullable: true })
  userAgent: string; // Will be encrypted at rest

  @Column({ type: 'boolean', default: false })
  phiAccessed: boolean; // HIPAA tracking flag

  @Column({ type: 'text', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: Date, default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  // Cryptographic integrity fields (blockchain-style chaining)
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  hash: string; // SHA-256 hash of this log entry

  @Column({ type: 'varchar', length: 64, nullable: true })
  previousHash: string; // SHA-256 hash of previous log entry (chain validation)

  @Column({ type: 'boolean', default: false })
  integrityVerified: boolean; // Flag to indicate if hash chain is valid

  // Relations
  @ManyToOne('User', (user: any) => user.auditLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: any;
}
