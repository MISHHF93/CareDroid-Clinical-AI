import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CollaborationMessageSenderType {
  USER = 'user',
  SYSTEM = 'system',
  AI_CHIEF = 'ai_chief',
}

/** Where a message originated — lets the UI/analytics distinguish human chat from workflow-driven posts. */
export enum CollaborationMessageSourceType {
  MANUAL = 'manual',
  ALERT = 'alert',
  AI_RECOMMENDATION = 'ai_recommendation',
  WORKFLOW_EVENT = 'workflow_event',
  ESCALATION = 'escalation',
  HANDOVER = 'handover',
}

@Entity('collaboration_messages')
@Index(['channelId', 'createdAt'])
@Index(['threadRootId'])
export class CollaborationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  channelId: string;

  /** Set on threaded replies; null for top-level messages. */
  @Column({ type: 'uuid', nullable: true })
  threadRootId: string | null;

  /** Null for system/AI-Chief generated messages. */
  @Column({ type: 'uuid', nullable: true })
  senderId: string | null;

  @Column({
    type: 'varchar',
    enum: CollaborationMessageSenderType,
    default: CollaborationMessageSenderType.USER,
  })
  senderType: CollaborationMessageSenderType;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'simple-json', nullable: true })
  mentionedUserIds: string[] | null;

  @Column({ type: Date, nullable: true })
  pinnedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  pinnedByUserId: string | null;

  @Column({ type: 'varchar', enum: CollaborationMessageSourceType, nullable: true })
  sourceType: CollaborationMessageSourceType | null;

  /** Loose reference to the originating alert id / AI query id / workflow log id, etc. */
  @Column({ type: 'varchar', length: 96, nullable: true })
  sourceId: string | null;

  @Column({ type: Date, nullable: true })
  editedAt: Date | null;

  @Column({ type: Date, nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  deletedByUserId: string | null;

  @ManyToOne('CollaborationChannel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: any;

  @CreateDateColumn()
  createdAt: Date;
}
