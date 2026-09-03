import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  EMERGENCY = 'emergency',
  MEDICATION_REMINDER = 'medication_reminder',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  LAB_RESULT = 'lab_result',
  SECURITY_ALERT = 'security_alert',
  SYSTEM_UPDATE = 'system_update',
  GENERAL = 'general',
  COLLABORATION_MENTION = 'collaboration_mention',
  COLLABORATION_MESSAGE = 'collaboration_message',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'varchar',
    enum: NotificationType,
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'varchar',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  fcmMessageId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  apnsMessageId: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: Date, nullable: true })
  sentAt: Date;

  @Column({ type: Date, nullable: true })
  deliveredAt: Date;

  @Column({ type: Date, nullable: true })
  readAt: Date;

  @Column({ type: Date, nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
