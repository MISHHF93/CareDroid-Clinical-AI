import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Durable CIG domain event log (PR-4).
 * Postgres may partition by occurred_at later; v1 is a single table for SQLite+Postgres.
 */
@Entity({ name: 'cig_events' })
@Index('cig_events_tenant_occurred', ['tenantId', 'occurredAt'])
@Index('cig_events_tenant_name', ['tenantId', 'name'])
export class CigEventEntity {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 120 })
  eventId: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 120 })
  tenantId: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'version', type: 'int' })
  version: number;

  @Column({ name: 'occurred_at', type: Date })
  occurredAt: Date;

  @Column({ name: 'received_at', type: Date, nullable: true })
  receivedAt?: Date | null;

  @Column({ name: 'producer', type: 'varchar', length: 160 })
  producer: string;

  @Column({ name: 'durability', type: 'varchar', length: 16 })
  durability: string;

  @Column({ name: 'pii_class', type: 'varchar', length: 16 })
  piiClass: string;

  @Column({ name: 'payload_json', type: 'simple-json' })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'correlation_id', type: 'varchar', length: 120, nullable: true })
  correlationId?: string | null;

  @Column({ name: 'causation_id', type: 'varchar', length: 120, nullable: true })
  causationId?: string | null;

  @Column({ name: 'organization_id', type: 'varchar', length: 120, nullable: true })
  organizationId?: string | null;

  @Column({ name: 'workspace_id', type: 'varchar', length: 120, nullable: true })
  workspaceId?: string | null;
}
