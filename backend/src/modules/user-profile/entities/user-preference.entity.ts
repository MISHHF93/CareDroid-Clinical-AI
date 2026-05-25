import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_preferences')
@Index(['userId'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20, default: 'system' })
  theme: 'light' | 'dark' | 'system';

  @Column({ type: 'varchar', length: 20, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 40, default: 'command' })
  defaultDashboard: string;

  @Column({ type: 'boolean', default: false })
  compactMode: boolean;

  @Column({ type: 'simple-json', nullable: true })
  accessibility: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  calculatorPreferences: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  toolPreferences: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  aiAssistantPreferences: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  notificationSettings: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
