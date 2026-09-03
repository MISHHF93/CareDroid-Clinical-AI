import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkspaceInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('workspace_invitations')
@Index(['workspaceId', 'email'])
export class WorkspaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 60 })
  role: string;

  @Column({ type: 'uuid' })
  invitedByUserId: string;

  @Column({
    type: 'varchar',
    enum: WorkspaceInvitationStatus,
    default: WorkspaceInvitationStatus.PENDING,
  })
  status: WorkspaceInvitationStatus;

  @Column({ type: Date, nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
