import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateAnalyticsAndAutomationAudit1706000800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'analytics_events',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'event', type: 'varchar', length: '255' },
          { name: 'userId', type: 'varchar', length: '255', isNullable: true },
          { name: 'organizationId', type: 'varchar', length: '255', isNullable: true },
          { name: 'workspaceId', type: 'varchar', length: '255', isNullable: true },
          { name: 'sessionId', type: 'varchar', length: '255' },
          { name: 'properties', type: 'text', isNullable: true },
          { name: 'platform', type: 'varchar', length: '255', isNullable: true },
          { name: 'userAgent', type: 'varchar', length: '255', isNullable: true },
          { name: 'screenResolution', type: 'varchar', length: '255', isNullable: true },
          { name: 'referrer', type: 'varchar', length: '255', isNullable: true },
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
        name: 'automation_audit_events',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'triggerFired', type: 'varchar', length: '255' },
          { name: 'conditionsEvaluated', type: 'text' },
          { name: 'actionSelected', type: 'varchar', length: '255' },
          { name: 'userId', type: 'varchar', length: '120' },
          { name: 'userName', type: 'varchar', length: '200' },
          { name: 'tenantId', type: 'varchar', length: '120' },
          { name: 'tenantName', type: 'varchar', length: '200' },
          { name: 'workspaceId', type: 'varchar', length: '120' },
          { name: 'workspaceName', type: 'varchar', length: '200' },
          { name: 'aiInvolved', type: 'boolean', default: false },
          { name: 'aiSummary', type: 'text', isNullable: true },
          { name: 'toolCalled', type: 'varchar', length: '160' },
          { name: 'backendEndpoint', type: 'varchar', length: '255' },
          { name: 'status', type: 'varchar', length: '16' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'timestamp', type: dateTimeColumnType(queryRunner) },
          { name: 'reviewerRequired', type: 'boolean', default: false },
          { name: 'reviewerName', type: 'varchar', length: '200', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'analytics_events',
      new TableIndex({
        name: 'IDX_analytics_events_organizationId_createdAt',
        columnNames: ['organizationId', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'analytics_events',
      new TableIndex({
        name: 'IDX_analytics_events_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'analytics_events',
      new TableIndex({
        name: 'IDX_analytics_events_event_createdAt',
        columnNames: ['event', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'analytics_events',
      new TableIndex({ name: 'IDX_analytics_events_sessionId', columnNames: ['sessionId'] }),
    );
    await queryRunner.createIndex(
      'automation_audit_events',
      new TableIndex({
        name: 'IDX_automation_audit_events_tenantId_timestamp',
        columnNames: ['tenantId', 'timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'automation_audit_events',
      new TableIndex({
        name: 'IDX_automation_audit_events_status_timestamp',
        columnNames: ['status', 'timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('automation_audit_events', true);
    await queryRunner.dropTable('analytics_events', true);
  }
}
