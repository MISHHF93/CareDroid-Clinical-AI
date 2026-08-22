import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAiFeedback1772703500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_feedback',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'runId', type: 'varchar', length: '120' },
          { name: 'capabilityId', type: 'varchar', length: '80', isNullable: true },
          { name: 'userId', type: 'varchar', length: '120' },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'rating', type: 'varchar', length: '20' },
          { name: 'comment', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ai_feedback',
      new TableIndex({ name: 'IDX_ai_feedback_runId', columnNames: ['runId'] }),
    );
    await queryRunner.createIndex(
      'ai_feedback',
      new TableIndex({
        name: 'IDX_ai_feedback_organizationId_createdAt',
        columnNames: ['organizationId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_feedback');
  }
}
