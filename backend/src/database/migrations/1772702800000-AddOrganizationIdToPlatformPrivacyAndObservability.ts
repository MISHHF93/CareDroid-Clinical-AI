import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Closes the second half of the platform-governance tenant-scoping gap
 * (HEAL-338 already fixed PlatformReviewItem/PlatformConsentRecord, which
 * already carried an organizationId column -- these two never did).
 * Nullable, same rationale as HEAL-343's Patient/Alert migration: no
 * reliable backfill signal exists for pre-migration rows.
 */
export class AddOrganizationIdToPlatformPrivacyAndObservability1772702800000
  implements MigrationInterface
{
  private readonly tables = ['platform_privacy_requests', 'platform_observability_events'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.addColumn(
        table,
        new TableColumn({ name: 'organizationId', type: 'uuid', isNullable: true }),
      );
      await queryRunner.createIndex(
        table,
        new TableIndex({ name: `IDX_${table}_organizationId`, columnNames: ['organizationId'] }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.dropIndex(table, `IDX_${table}_organizationId`);
      await queryRunner.dropColumn(table, 'organizationId');
    }
  }
}
