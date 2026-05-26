import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateArtifactsTables1769385600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'artifacts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '96',
            isPrimary: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '40',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '180',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'relationships',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'artifact_versions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '96',
            isPrimary: true,
          },
          {
            name: 'artifactId',
            type: 'varchar',
            length: '96',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '40',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '180',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'relationships',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'changeSummary',
            type: 'varchar',
            length: '180',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'artifacts',
      new TableIndex({ name: 'IDX_artifacts_type', columnNames: ['type'] }),
    );
    await queryRunner.createIndex(
      'artifacts',
      new TableIndex({ name: 'IDX_artifacts_version', columnNames: ['version'] }),
    );
    await queryRunner.createIndex(
      'artifact_versions',
      new TableIndex({
        name: 'IDX_artifact_versions_artifactId_version',
        columnNames: ['artifactId', 'version'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('artifact_versions', 'IDX_artifact_versions_artifactId_version');
    await queryRunner.dropIndex('artifacts', 'IDX_artifacts_version');
    await queryRunner.dropIndex('artifacts', 'IDX_artifacts_type');
    await queryRunner.dropTable('artifact_versions');
    await queryRunner.dropTable('artifacts');
  }
}
