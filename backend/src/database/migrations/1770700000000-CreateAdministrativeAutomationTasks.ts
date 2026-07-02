import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAdministrativeAutomationTasks1770700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'administrative_automation_tasks',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'organizationId', type: 'varchar', length: '120' },
          { name: 'workspaceId', type: 'varchar', length: '120' },
          { name: 'category', type: 'varchar', length: '64' },
          { name: 'status', type: 'varchar', length: '32', default: "'pending_review'" },
          { name: 'priority', type: 'varchar', length: '32', default: "'medium'" },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'task', type: 'text' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'administrative_automation_tasks',
      new TableIndex({
        name: 'IDX_admin_auto_tasks_org_workspace_status',
        columnNames: ['organizationId', 'workspaceId', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('administrative_automation_tasks');
  }
}