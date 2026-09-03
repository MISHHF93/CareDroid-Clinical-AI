import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * The ED's only nurse-facing "flag this patient for physician attention"
 * mechanism (EmergencyPatientService.escalatePatient, and any other caller of
 * dispatchOperationalAlert) dispatched a pure broadcast alert with no
 * intended-recipient at all -- every role with ALERT_ACKNOWLEDGE permission
 * (~15 roles including every nurse and physician tier) could acknowledge it,
 * with no way to tell whether the physician it was actually meant for ever
 * saw it. The frontend Alert type (src/types/emergency.ts) already had an
 * `ownerRole` field and mapAlertToClinicalDisplay() already rendered it as an
 * "Owner: <role>" finding on ClinicalAlertsPage.tsx -- nothing on the real
 * (non-demo) alert path ever set it, and the backend Alert entity had no
 * column to persist it through even if it had. This closes the durability
 * half: escalatePatient() now sets ownerRole: 'physician' (see that call
 * site's doc comment for why a fixed default rather than a caller-selectable
 * target), and this survives a reload/rehydrate like every other alert field.
 *
 * Nullable -- every pre-existing alert row predates this and has no
 * intended-recipient signal to backfill from. Same addColumns/dropColumns
 * shape as the most recent migration on a sibling emergency-os table
 * (1772704600000).
 */
export class AddAlertsOwnerRoleColumn1772704700000 implements MigrationInterface {
  private readonly table = 'alerts';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      this.table,
      new TableColumn({
        name: 'ownerRole',
        type: 'varchar',
        length: '32',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(this.table, 'ownerRole');
  }
}
