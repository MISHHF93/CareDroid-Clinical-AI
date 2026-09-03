import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const SCOPED_INDEX_NAME = 'IDX_patients_organizationId_mrn_unique';
const NULL_ORG_INDEX_NAME = 'IDX_patients_mrn_unique_when_no_org';

/**
 * patients.mrn had no @Index/@Unique at all, and MRN is auto-generated as a
 * random 6-digit number in two independently-duplicated places
 * (EmergencyPatientService and receptionIntakeOrchestrator.ts) with zero
 * collision checking -- nothing in the stack has ever stopped two different
 * patients from ending up with the same MRN.
 *
 * organizationId is nullable (see AddOrganizationIdToPatientsAndAlerts --
 * legacy/unscoped rows, no reliable backfill signal), so this follows the
 * same split-partial-index shape as
 * SplitSentinelUnitUniqueIndexForNullOrganization1772703900000 rather than
 * one plain composite unique index: a plain (organizationId, mrn) index
 * would never actually enforce uniqueness for organizationId IS NULL rows
 * (SQL treats every NULL as distinct in a unique constraint), and two
 * different hospitals legitimately reusing the same random MRN scheme is not
 * a real collision -- MRN uniqueness only needs to hold within a tenant (or
 * within the null-org legacy bucket).
 *
 * mrn is NOT NULL at the DB level (confirmed against the live dev sqlite
 * schema: `notnull=1`, matching CreatePatients1772100000000's column
 * definition, which never set isNullable) -- no NULL-handling complication
 * for the column itself, only for the organizationId scoping above.
 *
 * Unlike AddTwoFactorAuthUserUniqueIndex1772704200000 (which deletes
 * pre-existing duplicate rows before indexing), patient rows are real
 * clinical records -- deleting or silently merging one to clear a MRN
 * collision would destroy chart data and is exactly the kind of silent
 * resolution this fix must never do (duplicate MRNs must surface for human
 * reception review, never be auto-resolved). So pre-existing conflicts are
 * deduped non-destructively: every row is kept, and every row EXCEPT the
 * earliest-created one in each (organizationId, mrn) collision group gets a
 * `-DUP-<id>` suffix appended to its mrn so the unique index can be created.
 * The suffix is grep-able so any real pre-existing collisions this uncovers
 * stay auditable rather than silently vanishing. Verified against the live
 * dev sqlite DB (caredroid.dev.sqlite, 28 patients): zero existing
 * duplicates today, so this step is a no-op there, but the migration must
 * not hard-fail on any environment where collisions already accumulated.
 */
export class AddPatientsMrnUniqueIndex1772704400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE patients
      SET mrn = mrn || '-DUP-' || id
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY "organizationId", mrn
                   ORDER BY "createdAt" ASC, id ASC
                 ) AS rn
          FROM patients
        ) ranked
        WHERE ranked.rn > 1
      )
    `);

    await queryRunner.createIndex(
      'patients',
      new TableIndex({
        name: SCOPED_INDEX_NAME,
        columnNames: ['organizationId', 'mrn'],
        isUnique: true,
        where: '"organizationId" IS NOT NULL',
      }),
    );
    await queryRunner.createIndex(
      'patients',
      new TableIndex({
        name: NULL_ORG_INDEX_NAME,
        columnNames: ['mrn'],
        isUnique: true,
        where: '"organizationId" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('patients', NULL_ORG_INDEX_NAME);
    await queryRunner.dropIndex('patients', SCOPED_INDEX_NAME);
    // Deliberately not un-suffixing `-DUP-<id>` mrn values: the suffix only
    // ever gets applied to rows that were true pre-existing collisions, and
    // reverting the index does not make those collisions safe again.
  }
}
