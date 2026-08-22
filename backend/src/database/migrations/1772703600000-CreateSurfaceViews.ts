import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSurfaceViews1772703600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'surface_views',
        columns: [
          { name: 'userId', type: 'varchar', length: '120', isPrimary: true },
          { name: 'surfaceKey', type: 'varchar', length: '80', isPrimary: true },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'viewedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'surface_views',
      new TableIndex({
        name: 'IDX_surface_views_organizationId_userId',
        columnNames: ['organizationId', 'userId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('surface_views');
  }
}
