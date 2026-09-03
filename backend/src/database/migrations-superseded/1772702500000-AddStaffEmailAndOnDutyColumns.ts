import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Closes the persistence half of scorecard roadmap item G1: the `staff` table
 * (seeded once from a 3-person fixture, never mutated) had no email column and
 * no on-duty flag, so there was no real "who is on shift right now" data
 * anywhere for waiting-room-safety escalation to route to -- only a static,
 * empty-by-default INCIDENT_ESCALATION_EMAILS list. See
 * ReassessmentService.getOnDutyChargeNurseEmails/notifyWaitingRoomEscalation
 * in emergency-os.services.ts for the consumer.
 */
export class AddStaffEmailAndOnDutyColumns1772702500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('staff', [
      new TableColumn({ name: 'email', type: 'varchar', length: '255', isNullable: true }),
      new TableColumn({ name: 'onDuty', type: 'boolean', default: false }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('staff', ['email', 'onDuty']);
  }
}
