import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * PlatformSourceProvenance was the one platform-governance table HEAL-338's
 * sweep and its own follow-up (AddOrganizationIdToPlatformPrivacyAndObservability)
 * both missed -- externalResourceId/patientId are caller-supplied (integrations.
 * controller.ts's GET /source-provenance/:sourceId, patient-clinical-data.
 * controller.ts's GET /patients/:patientId/source-data), so a collision with
 * another org's real synced record returned that org's provenance data
 * instead of the caller's own. Nullable, same rationale as every other
 * migration in this series: no reliable backfill signal exists for
 * pre-migration rows.
 */
export class AddOrganizationIdToPlatformSourceProvenance1772703700000
  implements MigrationInterface
{
  private readonly table = 'platform_source_provenance';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      this.table,
      new TableColumn({ name: 'organizationId', type: 'uuid', isNullable: true }),
    );
    await queryRunner.createIndex(
      this.table,
      new TableIndex({
        name: `IDX_${this.table}_organizationId`,
        columnNames: ['organizationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(this.table, `IDX_${this.table}_organizationId`);
    await queryRunner.dropColumn(this.table, 'organizationId');
  }
}
