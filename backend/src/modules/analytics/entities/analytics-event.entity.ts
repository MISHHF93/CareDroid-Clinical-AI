import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_events')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['event', 'createdAt'])
@Index(['sessionId'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  workspaceId: string;

  @Column()
  sessionId: string;

  @Column('text', { nullable: true })
  properties: Record<string, any>;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  screenResolution: string;

  @Column({ nullable: true })
  referrer: string;

  @CreateDateColumn()
  createdAt: Date;
}
