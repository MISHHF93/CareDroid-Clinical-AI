import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const OLD_INDEX_NAME = 'IDX_sentinel_inbound_patients_unitId_unique';
const SCOPED_INDEX_NAME = 'IDX_sentinel_inbound_patients_organizationId_unitId_unique';
const NULL_ORG_INDEX_NAME = 'IDX_sentinel_inbound_patients_unitId_unique_when_no_org';

/**
 * HEAL-347.26: sentinel_inbound_patients.unitId is the raw, caller-supplied
 * CAD/NEMSIS unit identifier (SentinelInboundService.upsertFromCadOrNemsis:
 * `const unitId = input.unitId || mapped.unitId;`) -- a distinct identity
 * space from SentinelUnitEntity.id, not namespaced per organization. The
 * HEAL-311 migration (AddSentinelInboundPatientUniqueUnitIndex) made this
 * GLOBALLY unique to close a same-org double-insert race, but that also
 * meant two different hospitals whose CAD/NEMSIS payloads use a colliding
 * unitId silently overwrite each other's pre-arrival PHI row (chief
 * complaint, vitals, narrative) via the same findOne-by-unitId lookup in
 * upsertFromCadOrNemsis -- real cross-tenant PHI corruption, not just a
 * read-side leak (the read side, listInbound/getInbound, was already fixed
 * under HEAL-308/HEAL-339).
 *
 * TWO partial unique indexes, not one plain composite (organizationId,
 * unitId) index: SQL treats every NULL as distinct from every other NULL in
 * a unique constraint, so a plain composite index would silently stop
 * enforcing HEAL-311's original same-unit race guarantee whenever
 * organizationId is null (no tenant context available to the caller) --
 * confirmed live, the HEAL-311 regression spec started allowing 2 rows
 * again for that case with a plain composite index. The scoped index below
 * covers every real, tenant-context-carrying caller; the second index keeps
 * the original unitId-only guarantee specifically for the null-org case.
 *
 * The old unitId-only constraint already guaranteed at most one row per
 * unitId, so this split can only ever be LESS restrictive than the old
 * index -- no pre-migration dedup needed.
 */
export class ScopeSentinelInboundPatientUniqueIndexByOrganization1772703100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sentinel_inbound_patients', OLD_INDEX_NAME);
    await queryRunner.createIndex(
      'sentinel_inbound_patients',
      new TableIndex({
        name: SCOPED_INDEX_NAME,
        columnNames: ['organizationId', 'unitId'],
        isUnique: true,
        where: '"organizationId" IS NOT NULL',
      }),
    );
    await queryRunner.createIndex(
      'sentinel_inbound_patients',
      new TableIndex({
        name: NULL_ORG_INDEX_NAME,
        columnNames: ['unitId'],
        isUnique: true,
        where: '"organizationId" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sentinel_inbound_patients', NULL_ORG_INDEX_NAME);
    await queryRunner.dropIndex('sentinel_inbound_patients', SCOPED_INDEX_NAME);
    await queryRunner.createIndex(
      'sentinel_inbound_patients',
      new TableIndex({
        name: OLD_INDEX_NAME,
        columnNames: ['unitId'],
        isUnique: true,
      }),
    );
  }
}
