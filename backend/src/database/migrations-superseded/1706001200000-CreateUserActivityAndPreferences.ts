import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateUserActivityAndPreferences1706001200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_activities',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'workspaceId', type: 'varchar', length: '36', isNullable: true },
          { name: 'category', type: 'varchar', length: '32' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'route', type: 'varchar', length: '255', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'occurredAt', type: dateTimeColumnType(queryRunner) },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_preferences',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'theme', type: 'varchar', length: '20', default: "'system'" },
          { name: 'language', type: 'varchar', length: '20', default: "'en'" },
          { name: 'defaultDashboard', type: 'varchar', length: '40', default: "'command'" },
          { name: 'compactMode', type: 'boolean', default: false },
          { name: 'accessibility', type: 'text', isNullable: true },
          { name: 'calculatorPreferences', type: 'text', isNullable: true },
          { name: 'toolPreferences', type: 'text', isNullable: true },
          { name: 'aiAssistantPreferences', type: 'text', isNullable: true },
          { name: 'notificationSettings', type: 'text', isNullable: true },
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

    await queryRunner.createTable(
      new Table({
        name: 'professional_profiles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'username', type: 'varchar', length: '120', isNullable: true },
          { name: 'profession', type: 'varchar', length: '120', isNullable: true },
          { name: 'department', type: 'varchar', length: '120', isNullable: true },
          { name: 'credentials', type: 'text', isNullable: true },
          { name: 'certifications', type: 'text', isNullable: true },
          { name: 'specialties', type: 'text', isNullable: true },
          { name: 'experienceLevel', type: 'varchar', length: '80', default: "'mid'" },
          { name: 'clinicalInterests', type: 'text', isNullable: true },
          { name: 'licenseRegion', type: 'varchar', length: '120', isNullable: true },
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
      'user_activities',
      new TableIndex({
        name: 'IDX_user_activities_userId_occurredAt',
        columnNames: ['userId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'user_activities',
      new TableIndex({
        name: 'IDX_user_activities_workspaceId_occurredAt',
        columnNames: ['workspaceId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'user_preferences',
      new TableIndex({
        name: 'IDX_user_preferences_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'professional_profiles',
      new TableIndex({
        name: 'IDX_professional_profiles_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );

    for (const table of ['user_activities', 'user_preferences', 'professional_profiles']) {
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
    await queryRunner.dropTable('professional_profiles', true);
    await queryRunner.dropTable('user_preferences', true);
    await queryRunner.dropTable('user_activities', true);
  }
}
