import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const NEW_INDEX_NAME = 'IDX_sentinel_units_organizationId_externalId_vendorId_unique';

/**
 * HEAL-347.26: sentinel_units had a GLOBAL unique index on
 * (externalId, vendorId) -- a CAD vendor's unit label (e.g. "Unit-12") is
 * not namespaced per hospital, and vendorId is a fixed per-adapter constant
 * ('webhook-cad', 'mock-cad') shared by every tenant hitting the same
 * ingest adapter. Two different organizations whose CAD systems both label
 * an ambulance the same way resolved to the SAME row in
 * SentinelTrackingService.upsertUnit() (organizationId only gets set once,
 * on first insert, and is never re-checked) -- the second org's live
 * GPS/status updates silently overwrote the first org's unit, so hospital
 * A's command center displayed hospital B's live ambulance position/status
 * as its own. A real patient-safety-relevant cross-tenant data corruption,
 * not just a read-side leak.
 *
 * The old (externalId, vendorId) constraint already guaranteed at most one
 * row per that pair, so widening it to (organizationId, externalId,
 * vendorId) can only ever be LESS restrictive -- no pre-migration dedup is
 * needed, unlike AddSentinelInboundPatientUniqueUnitIndex's migration.
 *
 * The original (externalId, vendorId) unique index was never given an
 * explicit name in either the entity's @Index decorator or
 * CreateSentinelTables's migration, so it exists under whatever name
 * TypeORM's schema sync auto-generated -- looked up by column match here
 * rather than guessed, so this doesn't break if that name differs across
 * environments.
 */
export class ScopeSentinelUnitUniqueIndexByOrganization1772703000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sentinel_units');
    const oldIndex = table?.indices.find(
      (index) =>
        index.isUnique &&
        index.columnNames.length === 2 &&
        index.columnNames.includes('externalId') &&
        index.columnNames.includes('vendorId'),
    );
    if (oldIndex) {
      await queryRunner.dropIndex('sentinel_units', oldIndex);
    }

    await queryRunner.createIndex(
      'sentinel_units',
      new TableIndex({
        name: NEW_INDEX_NAME,
        columnNames: ['organizationId', 'externalId', 'vendorId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sentinel_units', NEW_INDEX_NAME);
    await queryRunner.createIndex(
      'sentinel_units',
      new TableIndex({
        columnNames: ['externalId', 'vendorId'],
        isUnique: true,
      }),
    );
  }
}
