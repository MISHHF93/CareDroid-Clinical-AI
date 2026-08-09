import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEvaluationRuns1772702200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'evaluation_runs',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'runJson', type: 'text' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('evaluation_runs');
  }
}
