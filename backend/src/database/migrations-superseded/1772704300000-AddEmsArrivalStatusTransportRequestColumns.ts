import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds the columns EMSIntakeService.requestPhysicianTransport() needs to
 * persist a physician-initiated SIMULATED transport request on the
 * ems_arrival_status side table: `source` (distinguishes
 * 'physician_initiated_simulated' rows from real EMS-initiated arrivals,
 * where this column is left undefined/legacy), `requestedByStaffId` /
 * `requestedByName` (server-derived requesting physician identity, never
 * client-supplied), `reason`, `urgency`, and `location` (the clinical
 * details a physician reports during the call). All nullable -- every
 * pre-existing row is a real EMS-initiated arrival and is never relabeled.
 *
 * Without this migration these columns only exist under dev sqlite's
 * `synchronize: true` (see app.module.ts); data-source.ts hardcodes
 * `synchronize: false` for every real (Postgres) environment, so any
 * deployment without this migration would throw "column does not exist" the
 * first time requestPhysicianTransport() (or its read path,
 * buildInboundEmsRecord()) touched these fields.
 */
export class AddEmsArrivalStatusTransportRequestColumns1772704300000 implements MigrationInterface {
  private readonly table = 'ems_arrival_status';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(this.table, [
      new TableColumn({ name: 'source', type: 'varchar', length: '48', isNullable: true }),
      new TableColumn({
        name: 'requestedByStaffId',
        type: 'varchar',
        length: '96',
        isNullable: true,
      }),
      new TableColumn({
        name: 'requestedByName',
        type: 'varchar',
        length: '160',
        isNullable: true,
      }),
      new TableColumn({ name: 'reason', type: 'varchar', length: '2000', isNullable: true }),
      new TableColumn({ name: 'urgency', type: 'varchar', length: '8', isNullable: true }),
      new TableColumn({ name: 'location', type: 'varchar', length: '300', isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(this.table, [
      'source',
      'requestedByStaffId',
      'requestedByName',
      'reason',
      'urgency',
      'location',
    ]);
  }
}
