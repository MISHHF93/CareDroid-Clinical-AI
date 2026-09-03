import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMemoryTables1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'short_memory_entries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'workspaceId', type: 'uuid', isNullable: true },
          { name: 'type', type: 'varchar', length: '40' },
          { name: 'title', type: 'varchar', length: '180' },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'long_memory_entries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'workspaceId', type: 'uuid', isNullable: true },
          { name: 'type', type: 'varchar', length: '40' },
          { name: 'title', type: 'varchar', length: '180' },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'tags', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinical_memory_entries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'workspaceId', type: 'uuid', isNullable: true },
          { name: 'patientId', type: 'varchar', length: '96', isNullable: true },
          { name: 'type', type: 'varchar', length: '40' },
          { name: 'title', type: 'varchar', length: '180' },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'source', type: 'varchar', length: '80', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'short_memory_entries',
      new TableIndex({
        name: 'IDX_short_memory_user_type_updated',
        columnNames: ['userId', 'type', 'updatedAt'],
      }),
    );
    await queryRunner.createIndex(
      'short_memory_entries',
      new TableIndex({
        name: 'IDX_short_memory_user_workspace',
        columnNames: ['userId', 'workspaceId'],
      }),
    );
    await queryRunner.createIndex(
      'long_memory_entries',
      new TableIndex({
        name: 'IDX_long_memory_user_type_updated',
        columnNames: ['userId', 'type', 'updatedAt'],
      }),
    );
    await queryRunner.createIndex(
      'long_memory_entries',
      new TableIndex({
        name: 'IDX_long_memory_user_workspace',
        columnNames: ['userId', 'workspaceId'],
      }),
    );
    await queryRunner.createIndex(
      'clinical_memory_entries',
      new TableIndex({
        name: 'IDX_clinical_memory_user_type_updated',
        columnNames: ['userId', 'type', 'updatedAt'],
      }),
    );
    await queryRunner.createIndex(
      'clinical_memory_entries',
      new TableIndex({
        name: 'IDX_clinical_memory_user_patient',
        columnNames: ['userId', 'patientId'],
      }),
    );
    await queryRunner.createIndex(
      'clinical_memory_entries',
      new TableIndex({
        name: 'IDX_clinical_memory_workspace_updated',
        columnNames: ['workspaceId', 'updatedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('clinical_memory_entries', 'IDX_clinical_memory_workspace_updated');
    await queryRunner.dropIndex('clinical_memory_entries', 'IDX_clinical_memory_user_patient');
    await queryRunner.dropIndex('clinical_memory_entries', 'IDX_clinical_memory_user_type_updated');
    await queryRunner.dropIndex('long_memory_entries', 'IDX_long_memory_user_workspace');
    await queryRunner.dropIndex('long_memory_entries', 'IDX_long_memory_user_type_updated');
    await queryRunner.dropIndex('short_memory_entries', 'IDX_short_memory_user_workspace');
    await queryRunner.dropIndex('short_memory_entries', 'IDX_short_memory_user_type_updated');
    await queryRunner.dropTable('clinical_memory_entries');
    await queryRunner.dropTable('long_memory_entries');
    await queryRunner.dropTable('short_memory_entries');
  }
}
