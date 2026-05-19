import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum QueryStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  RATE_LIMITED = 'rate_limited',
  TIMEOUT = 'timeout',
}

@Entity('ai_queries')
@Index(['userId', 'createdAt'])
@Index(['createdAt'])
@Index(['status'])
export class AIQuery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ type: 'varchar', enum: QueryStatus, default: QueryStatus.SUCCESS })
  status: QueryStatus;

  @Column({ type: 'varchar', length: 100 })
  model: string; // e.g., 'gpt-4', 'gpt-3.5-turbo'

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: number; // Cost in USD

  @Column({ type: 'int', nullable: true })
  latencyMs: number; // Response time in milliseconds

  @Column({ type: 'varchar', length: 100, nullable: true })
  conversationId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  feature: string; // e.g., 'chat', 'rag', 'intent-classification'

  @Column({ type: 'varchar', length: 50, nullable: true })
  intentClassified: string; // Primary intent if classified

  @Column({ type: 'varchar', length: 50, nullable: true })
  toolUsed: string; // Tool ID if a tool was executed

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: any) => (value ? JSON.stringify(value) : null),
      from: (value: string) => (value ? JSON.parse(value) : null),
    },
  })
  metadata: Record<string, any>; // Additional metadata (temperature, top_p, etc.)

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
