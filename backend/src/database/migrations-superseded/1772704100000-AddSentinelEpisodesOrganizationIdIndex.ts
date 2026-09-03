import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Performance sweep finding: `SentinelTrackingService.listEpisodes()`
 * (sentinel-tracking.service.ts) runs
 * `episodeRepo.find({ where: { organizationId }, order: { updatedAt: 'DESC' }, take: 100 })`
 * -- filtered AND sorted on columns neither one of which is indexed.
 * `sentinel_ems_episodes` only has the `(unitId, status)` index from
 * CreateRemainingSentinelTables (1772700700000); nothing covers
 * `organizationId`/`updatedAt`. `listEpisodes()` is called from
 * `SentinelController.commandSnapshot()` and `.analytics()`
 * (sentinel.controller.ts), both real EMS command-dashboard endpoints that
 * pass the caller's organizationId through -- a live, per-tenant filtered
 * dashboard query with no supporting index, forcing a full table scan of
 * every organization's episodes on each load. A single compound index on
 * (organizationId, updatedAt) covers both the WHERE and the ORDER BY in one
 * index, matching the existing (organizationId, createdAt) pattern already
 * used on analytics_events/ai_feedback for the same query shape.
 */
export class AddSentinelEpisodesOrganizationIdIndex1772704100000 implements MigrationInterface {
  private readonly table = 'sentinel_ems_episodes';
  private readonly indexName = 'IDX_sentinel_ems_episodes_organizationId_updatedAt';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      this.table,
      new TableIndex({ name: this.indexName, columnNames: ['organizationId', 'updatedAt'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(this.table, this.indexName);
  }
}
