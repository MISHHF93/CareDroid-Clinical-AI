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
  response: string | null;

  @Column({ type: 'varchar', enum: QueryStatus, default: QueryStatus.SUCCESS })
  status: QueryStatus;

  @Column({ type: 'varchar', length: 100 })
  model: string; // e.g., 'claude-sonnet-4-20250514'

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

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assetId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  agentId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modelClass: string; // e.g., 'small', 'standard', 'large'

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelVersion: string; // Canonical vendor model name/version used for this run

  @Column({ type: 'varchar', length: 100, nullable: true })
  routingExpert: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  retrievalPolicy: string;

  @Column({ type: 'boolean', default: false })
  requiresHumanReview: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  estimatedCost: number;

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
