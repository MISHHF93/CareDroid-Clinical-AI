import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRoomsStaffAlerts1772300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'rooms',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'type', type: 'varchar', length: '32' },
          { name: 'status', type: 'varchar', length: '32' },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'staff',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'role', type: 'varchar', length: '16' },
          { name: 'active', type: 'boolean' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'alerts',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'severity', type: 'varchar', length: '16' },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'message', type: 'text' },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'dispatchedAt', type: 'varchar', length: '64' },
          { name: 'dismissed', type: 'boolean', default: false },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'alerts',
      new TableIndex({ name: 'IDX_alerts_patientId', columnNames: ['patientId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('alerts');
    await queryRunner.dropTable('staff');
    await queryRunner.dropTable('rooms');
  }
}
