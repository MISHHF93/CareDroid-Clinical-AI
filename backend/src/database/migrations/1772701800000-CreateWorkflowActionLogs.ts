import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWorkflowActionLogs1772701800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workflow_action_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '64', isPrimary: true },
          { name: 'tenantId', type: 'varchar', length: '64', isNullable: true },
          { name: 'patientId', type: 'varchar', length: '64', isNullable: true },
          { name: 'type', type: 'varchar', length: '48' },
          { name: 'timestamp', type: 'varchar', length: '32' },
          { name: 'payload', type: 'text' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'workflow_action_logs',
      new TableIndex({
        name: 'IDX_workflow_action_logs_tenant_timestamp',
        columnNames: ['tenantId', 'timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'workflow_action_logs',
      new TableIndex({
        name: 'IDX_workflow_action_logs_patient',
        columnNames: ['patientId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('workflow_action_logs', true);
  }
}
