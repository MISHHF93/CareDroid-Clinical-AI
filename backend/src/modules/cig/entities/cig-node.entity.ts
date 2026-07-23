import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Durable CIG node row (PR-4).
 * Soft-archive via archivedAt — never hard-delete while edges reference (ON DELETE RESTRICT).
 */
@Entity({ name: 'cig_nodes' })
@Index('cig_nodes_tenant_type', ['tenantId', 'entityType'])
@Index('cig_nodes_tenant_updated', ['tenantId', 'updatedAt'])
@Index('cig_nodes_tenant_phi', ['tenantId', 'phiClass'])
@Index('UQ_cig_nodes_tenant_entity_source', ['tenantId', 'entityType', 'sourceId'], {
  unique: true,
})
export class CigNodeEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 320 })
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 120 })
  tenantId: string;

  @Column({ name: 'organization_id', type: 'varchar', length: 120, nullable: true })
  organizationId?: string | null;

  @Column({ name: 'workspace_id', type: 'varchar', length: 120, nullable: true })
  workspaceId?: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType: string;

  @Column({ name: 'source_id', type: 'varchar', length: 160 })
  sourceId: string;

  @Column({ name: 'source_module', type: 'varchar', length: 120 })
  sourceModule: string;

  @Column({ name: 'label', type: 'varchar', length: 500 })
  label: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'route', type: 'varchar', length: 500, nullable: true })
  route?: string | null;

  @Column({ name: 'severity', type: 'varchar', length: 32, nullable: true })
  severity?: string | null;

  /** CigNodeState JSON */
  @Column({ name: 'state_json', type: 'simple-json' })
  stateJson: Record<string, unknown>;

  @Column({ name: 'metadata_json', type: 'simple-json' })
  metadataJson: Record<string, string | number | boolean | null>;

  @Column({ name: 'phi_class', type: 'varchar', length: 16 })
  phiClass: string;

  @Column({ name: 'durability', type: 'varchar', length: 16 })
  durability: string;

  @Column({ name: 'source_updated_at', type: 'datetime' })
  sourceUpdatedAt: Date;

  /** Per-node content revision (C2) */
  @Column({ name: 'version', type: 'int' })
  version: number;

  @Column({ name: 'projector_generation', type: 'varchar', length: 64, default: '0' })
  projectorGeneration: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash?: string | null;

  /** Denorm of tenant snapshot watermark */
  @Column({ name: 'last_graph_version', type: 'bigint', nullable: true })
  lastGraphVersion?: string | number | null;

  /** Soft-archive only — null means active in hot set */
  @Column({ name: 'archived_at', type: 'datetime', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'audit_cursor', type: 'varchar', length: 120, nullable: true })
  auditCursor?: string | null;
}
