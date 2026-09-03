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
// Partial indexes from the former hand-written CreateCigOperationalGraph
// migration. cig_edges_current_uniq is a correctness constraint: at most one
// *current* (valid_to IS NULL) edge per tenant/type/from/to.
@Index('cig_edges_current_uniq', ['tenantId', 'type', 'fromId', 'toId'], {
  unique: true,
  where: 'valid_to IS NULL',
})
@Index('cig_edges_from_current', ['tenantId', 'fromId'], { where: 'valid_to IS NULL' })
@Index('cig_edges_to_current', ['tenantId', 'toId'], { where: 'valid_to IS NULL' })
@Index('cig_edges_type_current', ['tenantId', 'type'], { where: 'valid_to IS NULL' })
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

  @Column({ name: 'weight', type: 'double precision', nullable: true })
  weight?: number | null;

  @Column({ name: 'confidence', type: 'double precision', nullable: true })
  confidence?: number | null;

  @Column({ name: 'valid_from', type: Date })
  validFrom: Date;

  /** null = current edge */
  @Column({ name: 'valid_to', type: Date, nullable: true })
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
