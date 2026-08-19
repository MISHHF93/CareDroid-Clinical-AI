import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// HEAL-347.33: was a plain FK with no uniqueness enforcement at all --
// NotificationPreferenceService's findOne-then-create-if-missing sequence
// (getPreferences/updatePreferences) had nothing stopping two concurrent
// calls from both inserting a row for the same user; a later findOne()
// then arbitrarily returns whichever duplicate the database happens to
// return first, silently losing a user's own opt-out/quiet-hours choice.
@Entity('notification_preferences')
@Index(['user'], { unique: true })
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  // Notification Categories
  @Column({ type: 'boolean', default: true })
  emergencyAlerts: boolean;

  @Column({ type: 'boolean', default: true })
  medicationReminders: boolean;

  @Column({ type: 'boolean', default: true })
  appointmentReminders: boolean;

  @Column({ type: 'boolean', default: true })
  labResults: boolean;

  @Column({ type: 'boolean', default: false })
  marketingCommunications: boolean;

  @Column({ type: 'boolean', default: true })
  securityAlerts: boolean;

  @Column({ type: 'boolean', default: true })
  systemUpdates: boolean;

  // Delivery Preferences
  @Column({ type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  smsEnabled: boolean;

  // Quiet Hours
  @Column({ type: 'boolean', default: false })
  quietHoursEnabled: boolean;

  @Column({ type: 'time', nullable: true })
  quietHoursStart: string;

  @Column({ type: 'time', nullable: true })
  quietHoursEnd: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
