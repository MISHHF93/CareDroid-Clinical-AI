import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreatePatients1772100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patients',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'mrn', type: 'varchar', length: '64' },
          { name: 'firstName', type: 'varchar', length: '120' },
          { name: 'lastName', type: 'varchar', length: '120' },
          { name: 'dob', type: 'varchar', length: '32' },
          { name: 'age', type: 'int' },
          { name: 'sex', type: 'varchar', length: '16' },
          { name: 'arrivalTime', type: 'varchar', length: '64' },
          { name: 'triageTime', type: 'varchar', length: '64', isNullable: true },
          { name: 'chiefComplaint', type: 'text' },
          { name: 'complaintCategory', type: 'varchar', length: '64' },
          { name: 'state', type: 'varchar', length: '32' },
          { name: 'priority', type: 'varchar', length: '8' },
          { name: 'vitals', type: 'text' },
          { name: 'flags', type: 'text' },
          { name: 'assignedStaffId', type: 'varchar', length: '120', isNullable: true },
          { name: 'roomId', type: 'varchar', length: '120', isNullable: true },
          { name: 'notes', type: 'text' },
          { name: 'timeline', type: 'text' },
          { name: 'triageAssist', type: 'text', isNullable: true },
          { name: 'triageAssistGeneratedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'arrivalMode', type: 'varchar', length: '32', isNullable: true },
          { name: 'registrationStatus', type: 'varchar', length: '32', isNullable: true },
          { name: 'triagePending', type: 'boolean', isNullable: true },
          { name: 'firstContactAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'queueDestination', type: 'varchar', length: '32', isNullable: true },
          { name: 'arrival', type: 'text', isNullable: true },
          { name: 'quickSafetyFlags', type: 'text', isNullable: true },
          { name: 'highRiskComplaintFlags', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'patients',
      new TableIndex({ name: 'IDX_patients_state', columnNames: ['state'] }),
    );
    await queryRunner.createIndex(
      'patients',
      new TableIndex({ name: 'IDX_patients_priority', columnNames: ['priority'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('patients');
  }
}
