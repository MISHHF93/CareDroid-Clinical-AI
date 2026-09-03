import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateAuditLogs1706000100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36', isNullable: true },
          { name: 'workspaceId', type: 'varchar', length: '36', isNullable: true },
          { name: 'organizationId', type: 'varchar', length: '36', isNullable: true },
          { name: 'actorUserId', type: 'varchar', length: '36', isNullable: true },
          { name: 'targetUserId', type: 'varchar', length: '36', isNullable: true },
          { name: 'membershipId', type: 'varchar', length: '36', isNullable: true },
          { name: 'action', type: 'varchar', length: '64' },
          { name: 'resource', type: 'varchar', length: '255' },
          { name: 'ipAddress', type: 'varchar', length: '45' },
          { name: 'userAgent', type: 'text', isNullable: true },
          { name: 'phiAccessed', type: 'boolean', default: false },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'timestamp', type: dateTimeColumnType(queryRunner), default: 'CURRENT_TIMESTAMP' },
          { name: 'hash', type: 'varchar', length: '64', isNullable: true },
          { name: 'previousHash', type: 'varchar', length: '64', isNullable: true },
          { name: 'integrityVerified', type: 'boolean', default: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_userId_timestamp',
        columnNames: ['userId', 'timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_phiAccessed_timestamp',
        columnNames: ['phiAccessed', 'timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ name: 'IDX_audit_logs_hash', columnNames: ['hash'] }),
    );

    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs', true);
  }
}
