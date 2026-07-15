import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePersonalizationSchema1772701100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'saved_prompts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'workspaceId', type: 'varchar', length: '36', isNullable: true },
          { name: 'title', type: 'varchar', length: '160' },
          { name: 'prompt', type: 'text' },
          { name: 'tags', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_ai_preferences',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          {
            name: 'preferredBehavior',
            type: 'varchar',
            length: '80',
            default: "'clinical_copilot'",
          },
          { name: 'recentPrompts', type: 'text', isNullable: true },
          { name: 'suggestedTools', type: 'text', isNullable: true },
          { name: 'recommendedWorkflows', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'saved_prompts',
      new TableIndex({
        name: 'IDX_saved_prompts_userId_workspaceId',
        columnNames: ['userId', 'workspaceId'],
      }),
    );
    await queryRunner.createIndex(
      'user_ai_preferences',
      new TableIndex({
        name: 'IDX_user_ai_preferences_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'saved_prompts',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'user_ai_preferences',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_ai_preferences', true);
    await queryRunner.dropTable('saved_prompts', true);
  }
}
