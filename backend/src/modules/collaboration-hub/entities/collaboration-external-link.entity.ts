import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Providers implementing the CollaborationProvider abstraction (see providers/). */
export enum CollaborationExternalProvider {
  SLACK = 'slack',
  TEAMS = 'teams',
  EMAIL = 'email',
  SMS = 'sms',
}

/**
 * Optional per-channel mirror configuration to an external collaboration tool.
 * Native CareDroid storage remains the source of truth; external providers are
 * best-effort outbound mirrors (see CollaborationProviderRegistry).
 */
@Entity('collaboration_external_links')
@Index(['channelId', 'provider'], { unique: true })
export class CollaborationExternalLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  channelId: string;

  @Column({ type: 'varchar', enum: CollaborationExternalProvider })
  provider: CollaborationExternalProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalChannelId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  config: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
