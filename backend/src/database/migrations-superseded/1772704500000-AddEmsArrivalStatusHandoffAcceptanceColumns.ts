import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds the columns EMSIntakeService.completeHandoff() needs to durably
 * persist a REAL EMS handoff acceptance on the ems_arrival_status side
 * table: `handoffAcceptedByStaffId` / `handoffAcceptedByStaffName` (the
 * RECEIVING clinician who accepted the handoff -- server-derived from the
 * authenticated session, never client-supplied; distinct from
 * `requestedByStaffId`/`requestedByName`, which is the requesting/EMS-side
 * identity for a physician-initiated SIMULATED transport, see
 * AddEmsArrivalStatusTransportRequestColumns1772704300000), plus structured
 * checklist content mirroring AmbulanceHandoffChecklist's own field names
 * (src/services/ambulanceHandoffChecklist.ts): `handoffIdentityStatus`,
 * `handoffVitalsReceived`, `handoffMedicationsEnRoute` (JSON array),
 * `handoffCriticalFlags` (JSON array), `handoffPatientDestination`.
 *
 * Before this migration, EMSPipeline.tsx's "Complete Handoff" click only
 * ever sent a stripped `{handoffAccepted, handoffAcceptedAt}` payload to
 * `POST /ems/handoff` -- the actual identity/vitals/medications/
 * critical-flags/destination checklist content a clinician filled in during
 * handoff, and who accepted it, were never transmitted and never durably
 * reached the backend at all (only living in the browser tab's local store,
 * see AmbulanceHandoffChecklist's own type doc comment). All columns
 * nullable -- every pre-existing row predates this checklist and has no
 * signal to backfill from.
 *
 * Follows the exact addColumns/dropColumns shape as
 * AddEmsArrivalStatusTransportRequestColumns1772704300000, the most recent
 * migration touching this same table.
 */
export class AddEmsArrivalStatusHandoffAcceptanceColumns1772704500000
  implements MigrationInterface
{
  private readonly table = 'ems_arrival_status';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(this.table, [
      new TableColumn({
        name: 'handoffAcceptedByStaffId',
        type: 'varchar',
        length: '96',
        isNullable: true,
      }),
      new TableColumn({
        name: 'handoffAcceptedByStaffName',
        type: 'varchar',
        length: '160',
        isNullable: true,
      }),
      new TableColumn({
        name: 'handoffIdentityStatus',
        type: 'varchar',
        length: '24',
        isNullable: true,
      }),
      new TableColumn({ name: 'handoffVitalsReceived', type: 'boolean', isNullable: true }),
      new TableColumn({ name: 'handoffMedicationsEnRoute', type: 'text', isNullable: true }),
      new TableColumn({ name: 'handoffCriticalFlags', type: 'text', isNullable: true }),
      new TableColumn({
        name: 'handoffPatientDestination',
        type: 'varchar',
        length: '24',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(this.table, [
      'handoffAcceptedByStaffId',
      'handoffAcceptedByStaffName',
      'handoffIdentityStatus',
      'handoffVitalsReceived',
      'handoffMedicationsEnRoute',
      'handoffCriticalFlags',
      'handoffPatientDestination',
    ]);
  }
}
