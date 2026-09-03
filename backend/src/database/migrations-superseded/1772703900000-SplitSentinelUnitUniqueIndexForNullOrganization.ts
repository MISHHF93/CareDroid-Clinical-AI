import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const OLD_INDEX_NAME = 'IDX_sentinel_units_organizationId_externalId_vendorId_unique';
const SCOPED_INDEX_NAME = 'IDX_sentinel_units_organizationId_externalId_vendorId_unique_scoped';
const NULL_ORG_INDEX_NAME = 'IDX_sentinel_units_externalId_vendorId_unique_when_no_org';

/**
 * ScopeSentinelUnitUniqueIndexByOrganization (1772703000000) widened
 * sentinel_units' unique index from (externalId, vendorId) to
 * (organizationId, externalId, vendorId) to stop two hospitals' CAD systems
 * from colliding on the same unit label. That migration used one PLAIN
 * composite index, but organizationId is nullable (no-tenant-context
 * ingestion, e.g. the mock adapter / tests) -- SQL treats every NULL as
 * distinct from every other NULL in a unique constraint, so the plain
 * composite index never actually enforced uniqueness for organizationId IS
 * NULL rows. SentinelTrackingService.upsertUnit() does a findOne-then-create
 * with no lock: two near-simultaneous CAD/AVL events for the same
 * never-before-seen no-org unit (e.g. two webhook deliveries for a unit's
 * first-ever position/status update landing as overlapping HTTP requests)
 * could both find no row and both insert, silently creating two rows for
 * one physical ambulance -- exactly the same gotcha already identified and
 * fixed for the sibling sentinel_inbound_patients table one migration later
 * (see ScopeSentinelInboundPatientUniqueIndexByOrganization, 1772703100000),
 * but missed here. Same fix: two partial unique indexes instead of one
 * plain composite one.
 *
 * The existing composite index already guarantees at most one row per
 * (organizationId, externalId, vendorId) for every organizationId IS NOT
 * NULL row, so this split can only ever be LESS restrictive for the null-org
 * case -- no pre-migration dedup needed for real tenant data.
 */
export class SplitSentinelUnitUniqueIndexForNullOrganization1772703900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sentinel_units');
    const oldIndex =
      table?.indices.find((index) => index.name === OLD_INDEX_NAME) ||
      table?.indices.find(
        (index) =>
          index.isUnique &&
          index.columnNames.length === 3 &&
          index.columnNames.includes('organizationId') &&
          index.columnNames.includes('externalId') &&
          index.columnNames.includes('vendorId'),
      );
    if (oldIndex) {
      await queryRunner.dropIndex('sentinel_units', oldIndex);
    }

    await queryRunner.createIndex(
      'sentinel_units',
      new TableIndex({
        name: SCOPED_INDEX_NAME,
        columnNames: ['organizationId', 'externalId', 'vendorId'],
        isUnique: true,
        where: '"organizationId" IS NOT NULL',
      }),
    );
    await queryRunner.createIndex(
      'sentinel_units',
      new TableIndex({
        name: NULL_ORG_INDEX_NAME,
        columnNames: ['externalId', 'vendorId'],
        isUnique: true,
        where: '"organizationId" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sentinel_units', NULL_ORG_INDEX_NAME);
    await queryRunner.dropIndex('sentinel_units', SCOPED_INDEX_NAME);
    await queryRunner.createIndex(
      'sentinel_units',
      new TableIndex({
        name: OLD_INDEX_NAME,
        columnNames: ['organizationId', 'externalId', 'vendorId'],
        isUnique: true,
      }),
    );
  }
}
