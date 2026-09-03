import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateNotificationsSchema1706000600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'type', type: 'varchar', length: '32', default: "'general'" },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'body', type: 'text' },
          { name: 'data', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '32', default: "'pending'" },
          { name: 'fcmMessageId', type: 'varchar', length: '500', isNullable: true },
          { name: 'apnsMessageId', type: 'varchar', length: '500', isNullable: true },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'sentAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'deliveredAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'readAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'expiresAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'notification_preferences',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'emergencyAlerts', type: 'boolean', default: true },
          { name: 'medicationReminders', type: 'boolean', default: true },
          { name: 'appointmentReminders', type: 'boolean', default: true },
          { name: 'labResults', type: 'boolean', default: true },
          { name: 'marketingCommunications', type: 'boolean', default: false },
          { name: 'securityAlerts', type: 'boolean', default: true },
          { name: 'systemUpdates', type: 'boolean', default: true },
          { name: 'pushEnabled', type: 'boolean', default: true },
          { name: 'emailEnabled', type: 'boolean', default: true },
          { name: 'smsEnabled', type: 'boolean', default: false },
          { name: 'quietHoursEnabled', type: 'boolean', default: false },
          { name: 'quietHoursStart', type: 'time', isNullable: true },
          { name: 'quietHoursEnd', type: 'time', isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'token', type: 'varchar', length: '500' },
          { name: 'platform', type: 'varchar', length: '16', default: "'android'" },
          { name: 'deviceModel', type: 'varchar', length: '255', isNullable: true },
          { name: 'osVersion', type: 'varchar', length: '100', isNullable: true },
          { name: 'appVersion', type: 'varchar', length: '100', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'lastUsedAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_status_createdAt',
        columnNames: ['status', 'createdAt'],
      }),
    );

    for (const table of ['notifications', 'notification_preferences', 'device_tokens']) {
      await queryRunner.createForeignKey(
        table,
        new TableForeignKey({
          columnNames: ['userId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('device_tokens', true);
    await queryRunner.dropTable('notification_preferences', true);
    await queryRunner.dropTable('notifications', true);
  }
}
