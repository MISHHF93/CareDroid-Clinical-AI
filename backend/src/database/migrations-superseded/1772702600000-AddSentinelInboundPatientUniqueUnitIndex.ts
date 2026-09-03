import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * HEAL-311: SentinelInboundPatientService.upsertFromCadOrNemsis() did a
 * findOne-by-unitId-then-save with no locking or DB constraint -- two
 * concurrent CAD/NEMSIS webhook deliveries for the same unit (a
 * duplicate/retried delivery, or a genuine double-submit) could both read
 * "no existing row" and both insert, leaving two PHI rows in
 * sentinel_inbound_patients for one real incoming patient. `status` never
 * transitions away from its 'en_route' default anywhere in this codebase
 * (the historical per-run lifecycle lives in sentinel_ems_episodes instead),
 * so this table is meant to hold a single current-snapshot row per unit --
 * a unique index on unitId enforces that invariant at the DB level.
 *
 * Any pre-existing duplicates (a symptom of the very race this migration
 * closes) are deduped first, keeping the most recently updated row per unit,
 * so the unique index can actually be created.
 */
export class AddSentinelInboundPatientUniqueUnitIndex1772702600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM sentinel_inbound_patients
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "unitId" ORDER BY "updatedAt" DESC, id DESC) AS rn
          FROM sentinel_inbound_patients
        ) ranked
        WHERE ranked.rn = 1
      )
    `);

    await queryRunner.createIndex(
      'sentinel_inbound_patients',
      new TableIndex({
        name: 'IDX_sentinel_inbound_patients_unitId_unique',
        columnNames: ['unitId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'sentinel_inbound_patients',
      'IDX_sentinel_inbound_patients_unitId_unique',
    );
  }
}
