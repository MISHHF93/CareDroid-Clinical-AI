import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubscriptionsAndUsage1772700300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'stripeCustomerId', type: 'varchar', length: '255', isNullable: true },
          { name: 'stripeSubscriptionId', type: 'varchar', length: '255', isNullable: true },
          { name: 'stripePriceId', type: 'varchar', length: '255', isNullable: true },
          { name: 'tier', type: 'varchar', length: '32', default: "'free'" },
          { name: 'status', type: 'varchar', length: '32', default: "'active'" },
          { name: 'currentPeriodStart', type: 'datetime', isNullable: true },
          { name: 'currentPeriodEnd', type: 'datetime', isNullable: true },
          { name: 'cancelAtPeriodEnd', type: 'boolean', default: false },
          { name: 'canceledAt', type: 'datetime', isNullable: true },
          { name: 'trialStart', type: 'datetime', isNullable: true },
          { name: 'trialEnd', type: 'datetime', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'usage_events',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'organizationId', type: 'varchar', length: '120' },
          { name: 'workspaceId', type: 'varchar', length: '120', isNullable: true },
          { name: 'userId', type: 'varchar', length: '120', isNullable: true },
          { name: 'userRole', type: 'varchar', length: '100', isNullable: true },
          { name: 'assetId', type: 'varchar', length: '120', isNullable: true },
          { name: 'eventType', type: 'varchar', length: '80' },
          { name: 'meterId', type: 'varchar', length: '80', isNullable: true },
          { name: 'source', type: 'varchar', length: '120', isNullable: true },
          { name: 'idempotencyKey', type: 'varchar', length: '180', isNullable: true },
          { name: 'quantity', type: 'float', default: 1 },
          { name: 'unit', type: 'varchar', length: '30' },
          { name: 'periodStart', type: 'datetime' },
          { name: 'periodEnd', type: 'datetime' },
          { name: 'occurredAt', type: 'datetime' },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_organizationId_occurredAt',
        columnNames: ['organizationId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_organizationId_workspaceId_occurredAt',
        columnNames: ['organizationId', 'workspaceId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_organizationId_assetId_occurredAt',
        columnNames: ['organizationId', 'assetId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_organizationId_eventType_occurredAt',
        columnNames: ['organizationId', 'eventType', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_organizationId_meterId_occurredAt',
        columnNames: ['organizationId', 'meterId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'usage_events',
      new TableIndex({
        name: 'IDX_usage_events_organizationId_idempotencyKey',
        columnNames: ['organizationId', 'idempotencyKey'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('usage_events', true);
    await queryRunner.dropTable('subscriptions', true);
  }
}
