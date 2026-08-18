import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Closes the last open piece of the emergency-os tenant-scoping gap's
 * TypeORM-backed side (see project memory "Emergency-OS Tenant Scoping Gap",
 * HEAL-347.5's deferral note): unlike patients/alerts, `ReferralService`'s
 * real, persisted referral records (`this.createdReferrals`, backed by this
 * table) never had ANY organizationId concept -- the synthetic
 * patient-derived rows in `getReferrals()` already inherit patient-list
 * scoping once given an organizationId, but a real created-and-persisted
 * referral had nowhere to store one. Nullable, same reasoning as
 * `AddOrganizationIdToPatientsAndAlerts`: no reliable backfill signal exists
 * for pre-migration rows.
 */
export class AddOrganizationIdToReferrals1772702900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'referrals',
      new TableColumn({ name: 'organizationId', type: 'varchar', length: '120', isNullable: true }),
    );
    await queryRunner.createIndex(
      'referrals',
      new TableIndex({ name: 'IDX_referrals_organizationId', columnNames: ['organizationId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('referrals', 'IDX_referrals_organizationId');
    await queryRunner.dropColumn('referrals', 'organizationId');
  }
}
