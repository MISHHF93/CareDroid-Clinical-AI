import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Clinical Intelligence Graph durable schema (PR-4).
 *
 * Portable SQLite + Postgres types (text/datetime/int/double).
 * Partial unique index on current edges; soft-archive nodes (no hard-delete while FKs exist).
 * Event table is non-partitioned in v1 (partition later on Postgres only).
 */
export class CreateCigOperationalGraph1772701500000 implements MigrationInterface {
  name = 'CreateCigOperationalGraph1772701500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cig_nodes',
        columns: [
          { name: 'id', type: 'varchar', length: '320', isPrimary: true },
          { name: 'tenant_id', type: 'varchar', length: '120' },
          { name: 'organization_id', type: 'varchar', length: '120', isNullable: true },
          { name: 'workspace_id', type: 'varchar', length: '120', isNullable: true },
          { name: 'entity_type', type: 'varchar', length: '64' },
          { name: 'source_id', type: 'varchar', length: '160' },
          { name: 'source_module', type: 'varchar', length: '120' },
          { name: 'label', type: 'varchar', length: '500' },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'route', type: 'varchar', length: '500', isNullable: true },
          { name: 'severity', type: 'varchar', length: '32', isNullable: true },
          { name: 'state_json', type: 'text' },
          { name: 'metadata_json', type: 'text' },
          { name: 'phi_class', type: 'varchar', length: '16' },
          { name: 'durability', type: 'varchar', length: '16' },
          { name: 'source_updated_at', type: 'datetime' },
          { name: 'version', type: 'int' },
          {
            name: 'projector_generation',
            type: 'varchar',
            length: '64',
            default: "'0'",
          },
          { name: 'content_hash', type: 'varchar', length: '64', isNullable: true },
          { name: 'last_graph_version', type: 'bigint', isNullable: true },
          { name: 'archived_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'audit_cursor', type: 'varchar', length: '120', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cig_nodes',
      new TableIndex({
        name: 'UQ_cig_nodes_tenant_entity_source',
        columnNames: ['tenant_id', 'entity_type', 'source_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'cig_nodes',
      new TableIndex({
        name: 'cig_nodes_tenant_type',
        columnNames: ['tenant_id', 'entity_type'],
      }),
    );
    await queryRunner.createIndex(
      'cig_nodes',
      new TableIndex({
        name: 'cig_nodes_tenant_updated',
        columnNames: ['tenant_id', 'updated_at'],
      }),
    );
    await queryRunner.createIndex(
      'cig_nodes',
      new TableIndex({
        name: 'cig_nodes_tenant_phi',
        columnNames: ['tenant_id', 'phi_class'],
      }),
    );

    // Active hot-set helper (partial index — SQLite + Postgres)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS cig_nodes_tenant_active ON cig_nodes (tenant_id) WHERE archived_at IS NULL`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'cig_edges',
        columns: [
          { name: 'id', type: 'varchar', length: '640', isPrimary: true },
          { name: 'tenant_id', type: 'varchar', length: '120' },
          { name: 'type', type: 'varchar', length: '64' },
          { name: 'from_id', type: 'varchar', length: '320' },
          { name: 'to_id', type: 'varchar', length: '320' },
          { name: 'label', type: 'varchar', length: '500', isNullable: true },
          { name: 'weight', type: 'double', isNullable: true },
          { name: 'confidence', type: 'double', isNullable: true },
          { name: 'valid_from', type: 'datetime' },
          { name: 'valid_to', type: 'datetime', isNullable: true },
          { name: 'source_module', type: 'varchar', length: '120' },
          { name: 'evidence_json', type: 'text', isNullable: true },
          { name: 'durability', type: 'varchar', length: '16' },
          { name: 'metadata_json', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'cig_edges',
      new TableForeignKey({
        name: 'FK_cig_edges_from_node',
        columnNames: ['from_id'],
        referencedTableName: 'cig_nodes',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'cig_edges',
      new TableForeignKey({
        name: 'FK_cig_edges_to_node',
        columnNames: ['to_id'],
        referencedTableName: 'cig_nodes',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'cig_edges',
      new TableIndex({
        name: 'cig_edges_tenant_from',
        columnNames: ['tenant_id', 'from_id'],
      }),
    );
    await queryRunner.createIndex(
      'cig_edges',
      new TableIndex({
        name: 'cig_edges_tenant_to',
        columnNames: ['tenant_id', 'to_id'],
      }),
    );
    await queryRunner.createIndex(
      'cig_edges',
      new TableIndex({
        name: 'cig_edges_tenant_type',
        columnNames: ['tenant_id', 'type'],
      }),
    );

    // Current-edge uniqueness + hot adjacency indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS cig_edges_current_uniq ON cig_edges (tenant_id, type, from_id, to_id) WHERE valid_to IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS cig_edges_from_current ON cig_edges (tenant_id, from_id) WHERE valid_to IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS cig_edges_to_current ON cig_edges (tenant_id, to_id) WHERE valid_to IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS cig_edges_type_current ON cig_edges (tenant_id, type) WHERE valid_to IS NULL`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'cig_events',
        columns: [
          { name: 'event_id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'tenant_id', type: 'varchar', length: '120' },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'version', type: 'int' },
          { name: 'occurred_at', type: 'datetime' },
          { name: 'received_at', type: 'datetime', isNullable: true },
          { name: 'producer', type: 'varchar', length: '160' },
          { name: 'durability', type: 'varchar', length: '16' },
          { name: 'pii_class', type: 'varchar', length: '16' },
          { name: 'payload_json', type: 'text' },
          { name: 'correlation_id', type: 'varchar', length: '120', isNullable: true },
          { name: 'causation_id', type: 'varchar', length: '120', isNullable: true },
          { name: 'organization_id', type: 'varchar', length: '120', isNullable: true },
          { name: 'workspace_id', type: 'varchar', length: '120', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'cig_events',
      new TableIndex({
        name: 'cig_events_tenant_occurred',
        columnNames: ['tenant_id', 'occurred_at'],
      }),
    );
    await queryRunner.createIndex(
      'cig_events',
      new TableIndex({
        name: 'cig_events_tenant_name',
        columnNames: ['tenant_id', 'name'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'cig_outbox',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'tenant_id', type: 'varchar', length: '120' },
          { name: 'event_id', type: 'varchar', length: '120' },
          { name: 'payload_json', type: 'text' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'processed_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'cig_outbox',
      new TableIndex({
        name: 'cig_outbox_tenant_created',
        columnNames: ['tenant_id', 'created_at'],
      }),
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS cig_outbox_unprocessed ON cig_outbox (created_at) WHERE processed_at IS NULL`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'cig_snapshots',
        columns: [
          { name: 'tenant_id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'version', type: 'bigint' },
          { name: 'generated_at', type: 'datetime' },
          { name: 'node_count', type: 'int' },
          { name: 'edge_count', type: 'int' },
          {
            name: 'projector_generation',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'durability',
            type: 'varchar',
            length: '16',
            default: "'session'",
          },
          { name: 'redis_key', type: 'varchar', length: '320', isNullable: true },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS cig_outbox_unprocessed`);
    await queryRunner.query(`DROP INDEX IF EXISTS cig_edges_type_current`);
    await queryRunner.query(`DROP INDEX IF EXISTS cig_edges_to_current`);
    await queryRunner.query(`DROP INDEX IF EXISTS cig_edges_from_current`);
    await queryRunner.query(`DROP INDEX IF EXISTS cig_edges_current_uniq`);
    await queryRunner.query(`DROP INDEX IF EXISTS cig_nodes_tenant_active`);

    await queryRunner.dropTable('cig_snapshots', true);
    await queryRunner.dropTable('cig_outbox', true);
    await queryRunner.dropTable('cig_events', true);
    await queryRunner.dropTable('cig_edges', true);
    await queryRunner.dropTable('cig_nodes', true);
  }
}
