import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPatientPiiEncryption1772200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('patients', [
      new TableColumn({ name: 'mrnEncrypted', type: 'text', isNullable: true }),
      new TableColumn({ name: 'firstNameEncrypted', type: 'text', isNullable: true }),
      new TableColumn({ name: 'lastNameEncrypted', type: 'text', isNullable: true }),
      new TableColumn({ name: 'dobEncrypted', type: 'text', isNullable: true }),
      new TableColumn({ name: 'piiFieldsEncrypted', type: 'boolean', default: false }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('patients', [
      'mrnEncrypted',
      'firstNameEncrypted',
      'lastNameEncrypted',
      'dobEncrypted',
      'piiFieldsEncrypted',
    ]);
  }
}
