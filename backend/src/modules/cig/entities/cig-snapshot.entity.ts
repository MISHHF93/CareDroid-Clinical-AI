import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Per-tenant CIG snapshot watermark (PR-4).
 * graphVersion / snapshotVersion authority for dual-read freshness (C2/C3).
 */
@Entity({ name: 'cig_snapshots' })
export class CigSnapshotEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'varchar', length: 120 })
  tenantId: string;

  @Column({ name: 'version', type: 'bigint' })
  version: string | number;

  @Column({ name: 'generated_at', type: Date })
  generatedAt: Date;

  @Column({ name: 'node_count', type: 'int' })
  nodeCount: number;

  @Column({ name: 'edge_count', type: 'int' })
  edgeCount: number;

  @Column({ name: 'projector_generation', type: 'varchar', length: 64, nullable: true })
  projectorGeneration?: string | null;

  @Column({ name: 'durability', type: 'varchar', length: 16, default: 'session' })
  durability: string;

  /** Optional Redis key for hot adjacency: cig:snap:{tenantId}:{version} */
  @Column({ name: 'redis_key', type: 'varchar', length: 320, nullable: true })
  redisKey?: string | null;
}
