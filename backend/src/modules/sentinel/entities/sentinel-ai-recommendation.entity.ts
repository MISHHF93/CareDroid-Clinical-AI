import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sentinel_ai_recommendations')
@Index(['humanReviewStatus', 'kind'])
export class SentinelAiRecommendationEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  kind: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'simple-json' })
  recommendations: string[];

  @Column({ type: 'simple-json' })
  evidence: Array<{ claim: string; sourceRef: string; observedAt?: string }>;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'varchar', length: 80 })
  modelId: string;

  @Column({ type: 'varchar', length: 40 })
  modelVersion: string;

  @Column({ type: 'varchar', length: 40 })
  orchestratorVersion: string;

  @Column({ type: 'boolean', default: true })
  requiresHumanReview: boolean;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  humanReviewStatus: string;

  @Column({ type: 'text' })
  disclaimer: string;

  @Column({ type: 'varchar', length: 16, default: 'live' })
  sourceState: string;

  @Column({ type: 'varchar', length: 64 })
  generatedAt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  linkedEntityType: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  linkedEntityId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reviewedAt: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
