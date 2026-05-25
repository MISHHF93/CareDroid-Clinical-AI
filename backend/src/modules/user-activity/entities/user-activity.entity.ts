import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum UserActivityCategory {
  CALCULATOR = 'calculator',
  TOOL = 'tool',
  AI_CHAT = 'ai_chat',
  FLEET = 'fleet',
  IOT = 'iot',
  WORKSPACE = 'workspace',
}

@Entity('user_activities')
@Index(['userId', 'occurredAt'])
@Index(['workspaceId', 'occurredAt'])
export class UserActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'varchar', enum: UserActivityCategory })
  category: UserActivityCategory;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  route: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'datetime' })
  occurredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
