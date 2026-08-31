import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * One row per ED visit. Until now no encounter table existed anywhere -- the
 * "encounter" was a timeline event on the patients row with an id derived
 * from the patient id, so a returning patient's new visit overwrote their
 * previous one in place. See encounter.entity.ts for the full rationale.
 */
export class CreateEdEncounters1772704800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ed_encounters',
        columns: [
          { name: 'id', type: 'varchar', length: '160', isPrimary: true },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'patientId', type: 'varchar', length: '120' },
          { name: 'status', type: 'varchar', length: '20' },
          { name: 'startedAt', type: 'varchar', length: '64' },
          { name: 'endedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'arrivalTime', type: 'varchar', length: '64', isNullable: true },
          { name: 'chiefComplaint', type: 'text', isNullable: true },
          { name: 'complaintCategory', type: 'varchar', length: '120', isNullable: true },
          { name: 'priority', type: 'varchar', length: '16', isNullable: true },
          { name: 'state', type: 'varchar', length: '40', isNullable: true },
          { name: 'arrivalMode', type: 'varchar', length: '40', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'ed_encounters',
      new TableIndex({ name: 'IDX_ed_encounters_org', columnNames: ['organizationId'] }),
    );
    await queryRunner.createIndex(
      'ed_encounters',
      new TableIndex({
        name: 'IDX_ed_encounters_org_patient',
        columnNames: ['organizationId', 'patientId'],
      }),
    );
    await queryRunner.createIndex(
      'ed_encounters',
      new TableIndex({
        name: 'IDX_ed_encounters_org_patient_status',
        columnNames: ['organizationId', 'patientId', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ed_encounters', true);
  }
}
