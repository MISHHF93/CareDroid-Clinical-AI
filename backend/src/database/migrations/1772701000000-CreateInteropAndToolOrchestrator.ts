import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateInteropAndToolOrchestrator1772701000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'integration_sources',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'workspaceId', type: 'varchar', length: '120', isNullable: true },
          { name: 'sourceSystem', type: 'varchar', length: '160' },
          { name: 'family', type: 'varchar', length: '64' },
          { name: 'vendor', type: 'varchar', length: '120', isNullable: true },
          { name: 'status', type: 'varchar', length: '80', default: "'active'" },
          { name: 'authMode', type: 'varchar', length: '80', default: "'shared-secret-or-token'" },
          { name: 'labels', type: 'text', default: "'[]'" },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'integration_event_records',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'sourceId', type: 'varchar', length: '36' },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'workspaceId', type: 'varchar', length: '120', isNullable: true },
          { name: 'sourceSystem', type: 'varchar', length: '160' },
          { name: 'family', type: 'varchar', length: '64' },
          { name: 'eventType', type: 'varchar', length: '120' },
          { name: 'vendor', type: 'varchar', length: '160', isNullable: true },
          { name: 'idempotencyKey', type: 'varchar', length: '220', isNullable: true },
          { name: 'processingStatus', type: 'varchar', length: '80', default: "'received'" },
          { name: 'rawEvent', type: 'text' },
          { name: 'routeResult', type: 'text', isNullable: true },
          { name: 'normalizedEventId', type: 'varchar', length: '36', isNullable: true },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'receivedAt', type: 'datetime' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'normalized_integration_events',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'rawEventRecordId', type: 'varchar', length: '36' },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'workspaceId', type: 'varchar', length: '120', isNullable: true },
          { name: 'kind', type: 'varchar', length: '80' },
          { name: 'sourceFamily', type: 'varchar', length: '64' },
          { name: 'sourceEventType', type: 'varchar', length: '120' },
          { name: 'parserStatus', type: 'varchar', length: '80' },
          { name: 'severity', type: 'varchar', length: '40' },
          { name: 'normalizedEvent', type: 'text' },
          { name: 'trigger', type: 'text', isNullable: true },
          { name: 'safeAction', type: 'text' },
          { name: 'labels', type: 'text', default: "'[]'" },
          { name: 'occurredAt', type: 'datetime' },
          { name: 'receivedAt', type: 'datetime' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'tool_results',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36', isNullable: true },
          { name: 'toolType', type: 'varchar', length: '100' },
          { name: 'input', type: 'text', isNullable: true },
          { name: 'output', type: 'text', isNullable: true },
          { name: 'timestamp', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'integration_sources',
      new TableIndex({
        name: 'IDX_integration_sources_org_ws_source_family',
        columnNames: ['organizationId', 'workspaceId', 'sourceSystem', 'family'],
      }),
    );
    await queryRunner.createIndex(
      'integration_event_records',
      new TableIndex({
        name: 'IDX_integration_event_records_org_ws_receivedAt',
        columnNames: ['organizationId', 'workspaceId', 'receivedAt'],
      }),
    );
    await queryRunner.createIndex(
      'integration_event_records',
      new TableIndex({
        name: 'IDX_integration_event_records_sourceId_receivedAt',
        columnNames: ['sourceId', 'receivedAt'],
      }),
    );
    await queryRunner.createIndex(
      'integration_event_records',
      new TableIndex({
        name: 'IDX_integration_event_records_idempotencyKey',
        columnNames: ['idempotencyKey'],
      }),
    );
    await queryRunner.createIndex(
      'normalized_integration_events',
      new TableIndex({
        name: 'IDX_normalized_integration_events_org_ws_occurredAt',
        columnNames: ['organizationId', 'workspaceId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'normalized_integration_events',
      new TableIndex({
        name: 'IDX_normalized_integration_events_rawEventRecordId',
        columnNames: ['rawEventRecordId'],
      }),
    );
    await queryRunner.createIndex(
      'normalized_integration_events',
      new TableIndex({
        name: 'IDX_normalized_integration_events_kind_severity',
        columnNames: ['kind', 'severity'],
      }),
    );
    await queryRunner.createIndex(
      'tool_results',
      new TableIndex({
        name: 'IDX_tool_results_userId_timestamp',
        columnNames: ['userId', 'timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'tool_results',
      new TableIndex({
        name: 'IDX_tool_results_toolType_timestamp',
        columnNames: ['toolType', 'timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tool_results', true);
    await queryRunner.dropTable('normalized_integration_events', true);
    await queryRunner.dropTable('integration_event_records', true);
    await queryRunner.dropTable('integration_sources', true);
  }
}
