import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateAIQueryTable1738348800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_queries',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'prompt',
            type: 'text',
          },
          {
            name: 'response',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'success'",
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'promptTokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'completionTokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalTokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 6,
            default: 0,
          },
          {
            name: 'latencyMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'conversationId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'feature',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'intentClassified',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'toolUsed',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'ai_queries',
      new TableIndex({
        name: 'IDX_ai_queries_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_queries',
      new TableIndex({
        name: 'IDX_ai_queries_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_queries',
      new TableIndex({
        name: 'IDX_ai_queries_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'ai_queries',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('ai_queries');

    if (table) {
      // Drop foreign keys
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('ai_queries', foreignKey);
      }

      // Drop indexes
      try {
        await queryRunner.dropIndex('ai_queries', 'IDX_ai_queries_userId_createdAt');
      } catch (_e) {
        // Index doesn't exist, continue
      }

      try {
        await queryRunner.dropIndex('ai_queries', 'IDX_ai_queries_createdAt');
      } catch (_e) {
        // Index doesn't exist, continue
      }

      try {
        await queryRunner.dropIndex('ai_queries', 'IDX_ai_queries_status');
      } catch (_e) {
        // Index doesn't exist, continue
      }

      // Drop table
      await queryRunner.dropTable('ai_queries');
    }
  }
}
