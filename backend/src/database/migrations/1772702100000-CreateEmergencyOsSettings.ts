import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEmergencyOsSettings1772702100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'emergency_os_settings',
        columns: [
          { name: 'organizationId', type: 'varchar', length: '120', isPrimary: true },
          { name: 'settingsJson', type: 'text' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('emergency_os_settings');
  }
}
