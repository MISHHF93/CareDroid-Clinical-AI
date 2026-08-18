import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * First step of closing the emergency-os tenant-scoping gap (see project
 * memory "Emergency-OS Tenant Scoping Gap"): `patients` and `alerts` are the
 * two tables `EmergencyPatientService` actually reads/writes through
 * `@InjectRepository` -- `staff`/`rooms` are seeded once from a fixture and
 * never persisted to their own tables at all (no `@InjectRepository(Staff|Room)`
 * exists anywhere), so adding the column there would be inert schema noise,
 * not a real fix. Nullable: no reliable backfill signal exists for
 * pre-migration rows (confirmed no room/staff linkage to derive an org from).
 */
export class AddOrganizationIdToPatientsAndAlerts1772702700000 implements MigrationInterface {
  private readonly tables = ['patients', 'alerts'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.addColumn(
        table,
        new TableColumn({ name: 'organizationId', type: 'varchar', length: '120', isNullable: true }),
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
