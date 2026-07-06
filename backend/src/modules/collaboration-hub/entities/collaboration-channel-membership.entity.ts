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

export enum CollaborationChannelMembershipRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum CollaborationChannelMembershipStatus {
  ACTIVE = 'active',
  MUTED = 'muted',
  REMOVED = 'removed',
}

export enum CollaborationNotificationPreference {
  ALL = 'all',
  MENTIONS = 'mentions',
  NONE = 'none',
}

@Entity('collaboration_channel_memberships')
@Index(['channelId', 'userId'], { unique: true })
@Index(['userId', 'status'])
export class CollaborationChannelMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  channelId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    enum: CollaborationChannelMembershipRole,
    default: CollaborationChannelMembershipRole.MEMBER,
  })
  role: CollaborationChannelMembershipRole;

  @Column({
    type: 'varchar',
    enum: CollaborationChannelMembershipStatus,
    default: CollaborationChannelMembershipStatus.ACTIVE,
  })
  status: CollaborationChannelMembershipStatus;

  @Column({
    type: 'varchar',
    enum: CollaborationNotificationPreference,
    default: CollaborationNotificationPreference.ALL,
  })
  notificationPreference: CollaborationNotificationPreference;

  /** Per-channel read cursor — deliberately not a per-message delivery-receipt table. */
  @Column({ type: 'uuid', nullable: true })
  lastReadMessageId: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  joinedAt: Date | null;

  @ManyToOne('CollaborationChannel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: any;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
