import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateClinicalReferenceData1706000900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'drugs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'genericName', type: 'varchar', length: '255' },
          { name: 'category', type: 'varchar', length: '100' },
          { name: 'dosage', type: 'text' },
          { name: 'indications', type: 'text' },
          { name: 'contraindications', type: 'text', isNullable: true },
          { name: 'sideEffects', type: 'text', isNullable: true },
          { name: 'interactions', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'protocols',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'category', type: 'varchar', length: '100' },
          { name: 'description', type: 'text' },
          { name: 'steps', type: 'text' },
          { name: 'priority', type: 'varchar', length: '50', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'drugs',
      new TableIndex({ name: 'IDX_drugs_name', columnNames: ['name'] }),
    );
    await queryRunner.createIndex(
      'drugs',
      new TableIndex({ name: 'IDX_drugs_category', columnNames: ['category'] }),
    );
    await queryRunner.createIndex(
      'protocols',
      new TableIndex({ name: 'IDX_protocols_name', columnNames: ['name'] }),
    );
    await queryRunner.createIndex(
      'protocols',
      new TableIndex({ name: 'IDX_protocols_category', columnNames: ['category'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('protocols', true);
    await queryRunner.dropTable('drugs', true);
  }
}
