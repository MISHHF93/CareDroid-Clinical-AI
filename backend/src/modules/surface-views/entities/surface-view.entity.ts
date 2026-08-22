import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Per-user "last viewed at" state for one operational surface (item 6:
 * change-since-last-view). One row per (userId, surfaceKey) -- touching a
 * surface upserts `viewedAt` to now(), and the service returns the row's
 * PREVIOUS `viewedAt` in the same call so a caller can compute "what's new
 * since I last looked" without a second round trip. `surfaceKey` is a
 * caller-defined string (e.g. `care-operations-inbox`), not an enum --
 * deliberately open so new surfaces can adopt this without a migration.
 */
@Entity('surface_views')
@Index(['organizationId', 'userId'])
export class SurfaceViewEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 80 })
  surfaceKey: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId?: string;

  @UpdateDateColumn()
  viewedAt: Date;
}
