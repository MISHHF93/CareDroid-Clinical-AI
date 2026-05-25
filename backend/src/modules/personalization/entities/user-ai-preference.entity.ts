import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_ai_preferences')
@Index(['userId'], { unique: true })
export class UserAiPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 80, default: 'clinical_copilot' })
  preferredBehavior: string;

  @Column({ type: 'simple-json', nullable: true })
  recentPrompts: Array<Record<string, any>>;

  @Column({ type: 'simple-json', nullable: true })
  suggestedTools: string[];

  @Column({ type: 'simple-json', nullable: true })
  recommendedWorkflows: Array<Record<string, any>>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
