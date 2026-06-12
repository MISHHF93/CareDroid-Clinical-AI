import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkspaceType {
  PERSONAL = 'personal',
  HOSPITAL = 'hospital',
  EMERGENCY = 'emergency',
  ICU = 'icu',
  CARDIOLOGY = 'cardiology',
  LABORATORY = 'laboratory',
  PHARMACY = 'pharmacy',
  OPERATIONS = 'operations',
  FLEET = 'fleet',
  MEDICAL_IOT = 'medical-iot',
  EDUCATION = 'education',
  SIMULATION = 'simulation',
  RESEARCH = 'research',
  GOVERNANCE = 'governance',
  AI_EVALUATION = 'ai-evaluation',
  ADMIN = 'admin',
}

@Entity('workspaces')
@Index(['type', 'slug'])
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', enum: WorkspaceType })
  type: WorkspaceType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  parentWorkspaceId: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId: string;

  @Column({ type: 'simple-json', nullable: true })
  branding: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  settings: Record<string, any>;

  @ManyToOne('Organization', (organization: any) => organization.workspaces, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: any;

  @OneToMany('WorkspaceMembership', (membership: any) => membership.workspace)
  memberships: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
