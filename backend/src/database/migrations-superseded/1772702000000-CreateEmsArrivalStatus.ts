import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateEmsArrivalStatus1772702000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ems_arrival_status',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'status', type: 'varchar', length: '32' },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'unitId', type: 'varchar', length: '96', isNullable: true },
          { name: 'unitName', type: 'varchar', length: '120', isNullable: true },
          { name: 'arrivedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'handoffStartedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'handoffCompletedAt', type: 'varchar', length: '64', isNullable: true },
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
      'ems_arrival_status',
      new TableIndex({ name: 'IDX_ems_arrival_status_patientId', columnNames: ['patientId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ems_arrival_status');
  }
}
