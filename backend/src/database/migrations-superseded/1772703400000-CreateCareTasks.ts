import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateCareTasks1772703400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'care_tasks',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'organizationId', type: 'varchar', length: '120' },
          { name: 'taskType', type: 'varchar', length: '40' },
          { name: 'status', type: 'varchar', length: '20' },
          { name: 'priority', type: 'varchar', length: '16' },
          { name: 'ownerRole', type: 'varchar', length: '60', isNullable: true },
          { name: 'ownerUserId', type: 'varchar', length: '120', isNullable: true },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'encounterId', type: 'varchar', length: '120', isNullable: true },
          { name: 'reason', type: 'text' },
          { name: 'sourceEvent', type: 'varchar', length: '80' },
          { name: 'dedupeKey', type: 'varchar', length: '160' },
          { name: 'deepLink', type: 'varchar', length: '300', isNullable: true },
          { name: 'dueAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'acknowledgedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'acknowledgedBy', type: 'varchar', length: '120', isNullable: true },
          { name: 'completedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'completedBy', type: 'varchar', length: '120', isNullable: true },
          { name: 'cancelledAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'cancelledBy', type: 'varchar', length: '120', isNullable: true },
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
      'care_tasks',
      new TableIndex({ name: 'IDX_care_tasks_organizationId', columnNames: ['organizationId'] }),
    );
    await queryRunner.createIndex(
      'care_tasks',
      new TableIndex({
        name: 'IDX_care_tasks_organizationId_status',
        columnNames: ['organizationId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'care_tasks',
      new TableIndex({
        name: 'IDX_care_tasks_organizationId_dedupeKey',
        columnNames: ['organizationId', 'dedupeKey'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('care_tasks');
  }
}
