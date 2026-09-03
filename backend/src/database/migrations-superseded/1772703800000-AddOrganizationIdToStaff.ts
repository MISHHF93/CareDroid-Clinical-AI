import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Closes the "cross-org staff hijack" half of the BOLA audit: GET
 * /emergency/staff and PATCH /emergency/staff/:staffId/duty-status had zero
 * organization scoping, and the Staff entity had no organizationId column
 * at all to scope by. A caller in one org could list every hospital's
 * staff directory, then PATCH a staff record belonging to a different org
 * -- setting onDuty: true and overwriting email with an attacker-controlled
 * address. notifyWaitingRoomEscalation() later queries on-duty charge-nurse
 * emails and sends that address a real escalating patient's patientId and
 * clinical message -- a cross-tenant PHI leak that simultaneously corrupts
 * a real hospital's safety-escalation routing. Nullable, same rationale as
 * every other migration in this series: no reliable backfill signal exists
 * for pre-migration (seeded/fixture) staff rows.
 */
export class AddOrganizationIdToStaff1772703800000 implements MigrationInterface {
  private readonly table = 'staff';

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
