import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

/**
 * CareDroid Sentinel tables — SQLite/Postgres compatible column types.
 * Geometry/PostGIS is optional and not required for v1 (JSON rings + Haversine).
 */
export class CreateSentinelTables1772500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sentinel_units',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'externalId', type: 'varchar', length: '120' },
          { name: 'vendorId', type: 'varchar', length: '64', default: "'mock'" },
          { name: 'label', type: 'varchar', length: '120' },
          { name: 'unitType', type: 'varchar', length: '16', default: "'ALS'" },
          { name: 'status', type: 'varchar', length: '32', default: "'available'" },
          { name: 'freshness', type: 'varchar', length: '16', default: "'offline'" },
          { name: 'latitude', type: 'float', isNullable: true },
          { name: 'longitude', type: 'float', isNullable: true },
          { name: 'heading', type: 'float', isNullable: true },
          { name: 'speedKmh', type: 'float', isNullable: true },
          { name: 'lastSeenAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'lastEventSeq', type: 'integer', default: 0 },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'workspaceId', type: 'varchar', length: '120', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_outbox',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'aggregateType', type: 'varchar', length: '64' },
          { name: 'aggregateId', type: 'varchar', length: '120' },
          { name: 'eventType', type: 'varchar', length: '64' },
          { name: 'payload', type: 'text' },
          { name: 'status', type: 'varchar', length: '16', default: "'pending'" },
          { name: 'attempts', type: 'integer', default: 0 },
          { name: 'availableAt', type: 'varchar', length: '64' },
          { name: 'publishedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'lastError', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_alarms',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'fingerprint', type: 'varchar', length: '80' },
          { name: 'source', type: 'varchar', length: '64' },
          { name: 'category', type: 'varchar', length: '64' },
          { name: 'ruleId', type: 'varchar', length: '64' },
          { name: 'subjectId', type: 'varchar', length: '120' },
          { name: 'severity', type: 'varchar', length: '16' },
          { name: 'urgency', type: 'varchar', length: '16' },
          { name: 'status', type: 'varchar', length: '16', default: "'open'" },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'message', type: 'text' },
          { name: 'createdAtIso', type: 'varchar', length: '64' },
          { name: 'acknowledgedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'acknowledgedBy', type: 'varchar', length: '120', isNullable: true },
          { name: 'escalatedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'resolvedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'dismissedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'expiredAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'suppressUntil', type: 'varchar', length: '64', isNullable: true },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sentinel_outbox',
      new TableIndex({
        name: 'IDX_sentinel_outbox_status_available',
        columnNames: ['status', 'availableAt'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_alarms',
      new TableIndex({ name: 'IDX_sentinel_alarms_fingerprint', columnNames: ['fingerprint'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sentinel_alarms', true);
    await queryRunner.dropTable('sentinel_outbox', true);
    await queryRunner.dropTable('sentinel_units', true);
  }
}
