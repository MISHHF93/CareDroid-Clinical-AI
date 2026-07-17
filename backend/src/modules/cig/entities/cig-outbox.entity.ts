import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Transactional outbox for Mode A projection (K14).
 * Unprocessed rows: processedAt IS NULL.
 */
@Entity({ name: 'cig_outbox' })
@Index('cig_outbox_tenant_created', ['tenantId', 'createdAt'])
export class CigOutboxEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 120 })
  tenantId: string;

  @Column({ name: 'event_id', type: 'varchar', length: 120 })
  eventId: string;

  @Column({ name: 'payload_json', type: 'simple-json' })
  payloadJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date | null;
}
