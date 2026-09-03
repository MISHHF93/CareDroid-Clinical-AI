import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Referral status updates had no actor-tracking at all beyond
 * `requestingStaffId` (who originally CREATED the referral) -- accepting,
 * declining, or completing a referral was silently attributed to whoever
 * requested it, even when a completely different receiving-side staff
 * member actually changed the status. `lastActionByStaffId`/
 * `lastActionByName` close that gap, server-derived from the authenticated
 * session in EmergencyOsController.updateTransferStatus, never
 * client-supplied -- same shape and reasoning as
 * AddEmsArrivalStatusHandoffAcceptanceColumns1772704500000's
 * `handoffAcceptedByStaffId`/`handoffAcceptedByStaffName` on the sibling
 * ems_arrival_status table (that migration's own doc comment explains the
 * identical requester-vs-acceptor distinction).
 *
 * `responseNote` closes a second, related gap: ReferralPanel.tsx already
 * captures a decline/response reason in the UI (the `needsResponseNote`
 * field), but the backend PATCH transfers/:id/status route only ever
 * accepted `{status}` -- the reason was silently discarded, never reaching
 * the backend, lost on reload or at a different workstation.
 *
 * All 3 columns nullable -- every pre-existing referral row predates this
 * tracking and has no signal to backfill from. Follows the exact
 * addColumns/dropColumns shape as the most recent migration touching a
 * sibling emergency-os table (1772704500000 above).
 */
export class AddReferralActorAndResponseNoteColumns1772704600000 implements MigrationInterface {
  private readonly table = 'referrals';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(this.table, [
      new TableColumn({
        name: 'lastActionByStaffId',
        type: 'varchar',
        length: '120',
        isNullable: true,
      }),
      new TableColumn({
        name: 'lastActionByName',
        type: 'varchar',
        length: '160',
        isNullable: true,
      }),
      new TableColumn({ name: 'responseNote', type: 'text', isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(this.table, [
      'lastActionByStaffId',
      'lastActionByName',
      'responseNote',
    ]);
  }
}
