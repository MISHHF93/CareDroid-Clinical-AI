import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTrainingRuns1772702300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'training_runs',
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
    await queryRunner.dropTable('training_runs');
  }
}
