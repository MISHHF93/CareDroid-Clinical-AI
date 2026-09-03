import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateReferrals1772701900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'referrals',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'patientId', type: 'varchar', length: '120' },
          { name: 'requestingStaffId', type: 'varchar', length: '120' },
          { name: 'targetDepartment', type: 'varchar', length: '120' },
          { name: 'specialty', type: 'varchar', length: '120' },
          { name: 'urgency', type: 'varchar', length: '32' },
          { name: 'reason', type: 'text' },
          { name: 'clinicalSummary', type: 'text' },
          { name: 'status', type: 'varchar', length: '32' },
          { name: 'workflow', type: 'varchar', length: '64' },
          { name: 'requestedAt', type: 'varchar', length: '64' },
          { name: 'statusUpdatedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({ name: 'IDX_referrals_patientId', columnNames: ['patientId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('referrals');
  }
}
