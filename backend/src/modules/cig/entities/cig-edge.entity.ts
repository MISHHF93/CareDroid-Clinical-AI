import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Durable CIG edge row (PR-4).
 * Current edges: validTo IS NULL. Historical edges keep validTo for twin replay.
 * Partial unique index (tenant, type, from, to) WHERE valid_to IS NULL created in migration.
 */
@Entity({ name: 'cig_edges' })
@Index('cig_edges_tenant_from', ['tenantId', 'fromId'])
@Index('cig_edges_tenant_to', ['tenantId', 'toId'])
@Index('cig_edges_tenant_type', ['tenantId', 'type'])
export class CigEdgeEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 640 })
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 120 })
  tenantId: string;

  @Column({ name: 'type', type: 'varchar', length: 64 })
  type: string;

  @Column({ name: 'from_id', type: 'varchar', length: 320 })
  fromId: string;

  @Column({ name: 'to_id', type: 'varchar', length: 320 })
  toId: string;

  @Column({ name: 'label', type: 'varchar', length: 500, nullable: true })
  label?: string | null;

  @Column({ name: 'weight', type: 'double', nullable: true })
  weight?: number | null;

  @Column({ name: 'confidence', type: 'double', nullable: true })
  confidence?: number | null;

  @Column({ name: 'valid_from', type: 'datetime' })
  validFrom: Date;

  /** null = current edge */
  @Column({ name: 'valid_to', type: 'datetime', nullable: true })
  validTo?: Date | null;

  @Column({ name: 'source_module', type: 'varchar', length: 120 })
  sourceModule: string;

  @Column({ name: 'evidence_json', type: 'simple-json', nullable: true })
  evidenceJson?: string[] | null;

  @Column({ name: 'durability', type: 'varchar', length: 16 })
  durability: string;

  @Column({ name: 'metadata_json', type: 'simple-json', nullable: true })
  metadataJson?: Record<string, string | number | boolean | null> | null;
}
