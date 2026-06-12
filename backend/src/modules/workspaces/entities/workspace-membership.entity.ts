import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkspaceMembershipRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  CLINICIAN = 'clinician',
  NURSE = 'nurse',
  DISPATCHER = 'dispatcher',
  RESEARCHER = 'researcher',
  VIEWER = 'viewer',
}

export enum WorkspaceMembershipStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REMOVED = 'removed',
}

@Entity('workspace_memberships')
@Index(['workspaceId', 'userId'], { unique: true })
@Index(['userId', 'status'])
export class WorkspaceMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    enum: WorkspaceMembershipRole,
    default: WorkspaceMembershipRole.VIEWER,
  })
  role: WorkspaceMembershipRole;

  @Column({ type: 'simple-json', nullable: true })
  permissions: string[];

  @Column({ type: 'simple-json', nullable: true })
  teams: string[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  department: string;

  @Column({
    type: 'varchar',
    enum: WorkspaceMembershipStatus,
    default: WorkspaceMembershipStatus.ACTIVE,
  })
  status: WorkspaceMembershipStatus;

  @Column({ type: 'datetime', nullable: true })
  joinedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastAccessedAt: Date;

  @ManyToOne('Workspace', (workspace: any) => workspace.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: any;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
