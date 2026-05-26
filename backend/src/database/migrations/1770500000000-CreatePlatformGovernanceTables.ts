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
const metadata = { name: 'metadata', type: 'text', isNullable: true };

export class CreatePlatformGovernanceTables1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_governance_policies',
        columns: [
          idColumn,
          { name: 'organizationId', type: 'uuid', isNullable: true },
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'policyType', type: 'varchar', length: '80' },
          { name: 'version', type: 'varchar', length: '40', default: "'v1'" },
          { name: 'status', type: 'varchar', length: '40', default: "'draft'" },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'createdBy', type: 'uuid', isNullable: true },
          { name: 'approvedBy', type: 'uuid', isNullable: true },
          { name: 'effectiveAt', type: 'timestamp', isNullable: true },
          { name: 'retiredAt', type: 'timestamp', isNullable: true },
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_security_events',
        columns: [
          idColumn,
          { name: 'runId', type: 'varchar', length: '96', isNullable: true },
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'eventType', type: 'varchar', length: '80' },
          { name: 'severity', type: 'varchar', length: '40', default: "'medium'" },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'action', type: 'varchar', length: '120', isNullable: true },
          { name: 'inputHash', type: 'varchar', length: '128', isNullable: true },
          metadata,
          createdAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_regulatory_classifications',
        columns: [
          idColumn,
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'jurisdiction', type: 'varchar', length: '40', default: "'US'" },
          {
            name: 'classification',
            type: 'varchar',
            length: '80',
            default: "'clinical_decision_support'",
          },
          { name: 'riskLevel', type: 'varchar', length: '40', default: "'high'" },
          { name: 'intendedUse', type: 'text' },
          { name: 'excludedUses', type: 'text', isNullable: true },
          { name: 'requiresHumanReview', type: 'boolean', default: true },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'approvedBy', type: 'uuid', isNullable: true },
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_equity_metrics',
        columns: [
          idColumn,
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'cohortId', type: 'varchar', length: '96' },
          { name: 'metricName', type: 'varchar', length: '80' },
          { name: 'value', type: 'float', default: 0 },
          { name: 'denominator', type: 'int', default: 0 },
          { name: 'windowStart', type: 'timestamp', isNullable: true },
          { name: 'windowEnd', type: 'timestamp', isNullable: true },
          metadata,
          createdAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_validation_scenarios',
        columns: [
          idColumn,
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'scenarioType', type: 'varchar', length: '80' },
          { name: 'riskLevel', type: 'varchar', length: '40', default: "'high'" },
          { name: 'version', type: 'varchar', length: '40', default: "'v1'" },
          { name: 'status', type: 'varchar', length: '40', default: "'demo'" },
          { name: 'inputFixture', type: 'text', isNullable: true },
          { name: 'expectedAssertions', type: 'text', isNullable: true },
          { name: 'lastRunSummary', type: 'text', isNullable: true },
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_review_items',
        columns: [
          idColumn,
          { name: 'organizationId', type: 'uuid', isNullable: true },
          { name: 'patientId', type: 'varchar', length: '96', isNullable: true },
          { name: 'runId', type: 'varchar', length: '96', isNullable: true },
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'reviewType', type: 'varchar', length: '80' },
          { name: 'severity', type: 'varchar', length: '40', default: "'high'" },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'assignedTo', type: 'uuid', isNullable: true },
          { name: 'dueAt', type: 'timestamp', isNullable: true },
          { name: 'payload', type: 'text', isNullable: true },
          { name: 'decision', type: 'text', isNullable: true },
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_consent_records',
        columns: [
          idColumn,
          { name: 'patientId', type: 'varchar', length: '96' },
          { name: 'organizationId', type: 'uuid', isNullable: true },
          { name: 'scope', type: 'varchar', length: '80' },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'grantedAt', type: 'timestamp', isNullable: true },
          { name: 'expiresAt', type: 'timestamp', isNullable: true },
          { name: 'revokedAt', type: 'timestamp', isNullable: true },
          { name: 'source', type: 'varchar', length: '80', default: "'platform'" },
          { name: 'capturedBy', type: 'uuid', isNullable: true },
          metadata,
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_privacy_requests',
        columns: [
          idColumn,
          { name: 'patientId', type: 'varchar', length: '96' },
          { name: 'requestType', type: 'varchar', length: '80' },
          { name: 'status', type: 'varchar', length: '40', default: "'needs_review'" },
          { name: 'requestedBy', type: 'uuid', isNullable: true },
          { name: 'reviewedBy', type: 'uuid', isNullable: true },
          { name: 'dueAt', type: 'timestamp', isNullable: true },
          { name: 'resultArtifactUri', type: 'varchar', length: '255', isNullable: true },
          metadata,
          createdAt,
          updatedAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_observability_events',
        columns: [
          idColumn,
          { name: 'correlationId', type: 'varchar', length: '96', isNullable: true },
          { name: 'capabilityId', type: 'varchar', length: '96' },
          { name: 'eventType', type: 'varchar', length: '80' },
          { name: 'severity', type: 'varchar', length: '40', default: "'info'" },
          { name: 'status', type: 'varchar', length: '40', default: "'recorded'" },
          { name: 'durationMs', type: 'int', isNullable: true },
          { name: 'phiAccessed', type: 'boolean', default: false },
          metadata,
          createdAt,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_source_provenance',
        columns: [
          idColumn,
          { name: 'sourceSystem', type: 'varchar', length: '120' },
          { name: 'sourceType', type: 'varchar', length: '80' },
          { name: 'externalResourceId', type: 'varchar', length: '160' },
          { name: 'patientId', type: 'varchar', length: '96', isNullable: true },
          { name: 'resourceType', type: 'varchar', length: '80' },
          { name: 'fetchedAt', type: 'timestamp', isNullable: true },
          { name: 'freshness', type: 'varchar', length: '40', default: "'demo'" },
          { name: 'normalizedHash', type: 'varchar', length: '128', isNullable: true },
          metadata,
          createdAt,
        ],
      }),
      true,
    );

    await this.createIndexes(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'platform_source_provenance',
      'platform_observability_events',
      'platform_privacy_requests',
      'platform_consent_records',
      'platform_review_items',
      'platform_validation_scenarios',
      'platform_equity_metrics',
      'platform_regulatory_classifications',
      'platform_security_events',
      'platform_governance_policies',
    ]) {
      await queryRunner.dropTable(table, true);
    }
  }

  private async createIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<[string, string, string[]]> = [
      [
        'platform_governance_policies',
        'idx_platform_policies_capability_status',
        ['capabilityId', 'status'],
      ],
      ['platform_security_events', 'idx_platform_security_run', ['runId']],
      [
        'platform_regulatory_classifications',
        'idx_platform_reg_capability_status',
        ['capabilityId', 'status'],
      ],
      [
        'platform_equity_metrics',
        'idx_platform_equity_capability_cohort',
        ['capabilityId', 'cohortId'],
      ],
      [
        'platform_validation_scenarios',
        'idx_platform_validation_capability_status',
        ['capabilityId', 'status'],
      ],
      ['platform_review_items', 'idx_platform_review_patient_status', ['patientId', 'status']],
      [
        'platform_consent_records',
        'idx_platform_consent_patient_scope_status',
        ['patientId', 'scope', 'status'],
      ],
      ['platform_privacy_requests', 'idx_platform_privacy_patient_status', ['patientId', 'status']],
      [
        'platform_observability_events',
        'idx_platform_observability_correlation',
        ['correlationId'],
      ],
      [
        'platform_source_provenance',
        'idx_platform_source_patient_resource',
        ['patientId', 'resourceType'],
      ],
    ];

    for (const [table, name, columnNames] of indexes) {
      await queryRunner.createIndex(table, new TableIndex({ name, columnNames }));
    }
  }
}
