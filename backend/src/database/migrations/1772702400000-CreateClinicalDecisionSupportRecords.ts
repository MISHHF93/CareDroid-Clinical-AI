import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateClinicalDecisionSupportRecords1772702400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinical_calculator_results',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'recordJson', type: 'text' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'clinical_calculator_results',
      new TableIndex({
        name: 'IDX_clinical_calculator_results_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'copilot_interactions',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'patientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'recordJson', type: 'text' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'copilot_interactions',
      new TableIndex({ name: 'IDX_copilot_interactions_patientId', columnNames: ['patientId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('copilot_interactions');
    await queryRunner.dropTable('clinical_calculator_results');
  }
}
