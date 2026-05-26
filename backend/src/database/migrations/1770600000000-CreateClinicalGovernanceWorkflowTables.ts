import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const idColumn = {
  name: 'id',
  type: 'uuid',
  isPrimary: true,
  isGenerated: true,
  generationStrategy: 'uuid' as const,
};
const createdAt = { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' };
const updatedAt = { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' };

export class CreateClinicalGovernanceWorkflowTables1770600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinical_release_gates',
        columns: [
          idColumn,
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'changeType', type: 'varchar', length: '80' },
          { name: 'artifactVersion', type: 'varchar', length: '96', isNullable: true },
          { name: 'riskLevel', type: 'varchar', length: '40', default: "'high'" },
          { name: 'validationRunId', type: 'varchar', length: '96', isNullable: true },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'requiredApprovals', type: 'text', isNullable: true },
          { name: 'decision', type: 'text', isNullable: true },
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinical_safety_findings',
        columns: [
          idColumn,
          { name: 'runId', type: 'varchar', length: '96', isNullable: true },
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'severity', type: 'varchar', length: '40', default: "'high'" },
          {
            name: 'findingType',
            type: 'varchar',
            length: '80',
            default: "'clinical_safety'",
          },
          { name: 'source', type: 'varchar', length: '80', default: "'governance'" },
          { name: 'description', type: 'text' },
          { name: 'ownerUserId', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'resolution', type: 'text', isNullable: true },
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'clinical_release_gates',
      new TableIndex({
        name: 'idx_clinical_release_gates_capability_status',
        columnNames: ['capabilityId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'clinical_release_gates',
      new TableIndex({
        name: 'idx_clinical_release_gates_change_risk',
        columnNames: ['changeType', 'riskLevel'],
      }),
    );
    await queryRunner.createIndex(
      'clinical_safety_findings',
      new TableIndex({
        name: 'idx_clinical_safety_findings_capability_status',
        columnNames: ['capabilityId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'clinical_safety_findings',
      new TableIndex({
        name: 'idx_clinical_safety_findings_run',
        columnNames: ['runId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clinical_safety_findings', true);
    await queryRunner.dropTable('clinical_release_gates', true);
  }
}
