import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePlatformAssetsSchema1772700400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'role_profiles',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'label', type: 'varchar', length: '120' },
          { name: 'intendedRoles', type: 'text', default: "'[]'" },
          { name: 'specialties', type: 'text', default: "'[]'" },
          { name: 'preferredAssetIds', type: 'text', default: "'[]'" },
          { name: 'hiddenAssetIds', type: 'text', default: "'[]'" },
          { name: 'defaultDashboard', type: 'varchar', length: '64', default: "'command'" },
          { name: 'defaultAiAgentId', type: 'varchar', length: '64', isNullable: true },
          { name: 'requiredPermissions', type: 'text', default: "'[]'" },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'asset_packs',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'name', type: 'varchar', length: '180' },
          { name: 'slug', type: 'varchar', length: '120', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'organizationTypes', type: 'text', default: "'[]'" },
          { name: 'targetRoles', type: 'text', default: "'[]'" },
          { name: 'assetIds', type: 'text', default: "'[]'" },
          { name: 'requiredDependencies', type: 'text', default: "'[]'" },
          { name: 'salesMetadata', type: 'text', isNullable: true },
          { name: 'buyerPersona', type: 'text', default: "'[]'" },
          { name: 'decisionMaker', type: 'text', default: "'[]'" },
          { name: 'stakeholders', type: 'text', default: "'[]'" },
          { name: 'expectedOutcomes', type: 'text', default: "'[]'" },
          { name: 'defaultModules', type: 'text', default: "'[]'" },
          { name: 'pricingTier', type: 'varchar', length: '32', default: "'standard'" },
          { name: 'isPublished', type: 'boolean', default: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_assets',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'assetType', type: 'varchar', length: '40' },
          { name: 'title', type: 'varchar', length: '180' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'category', type: 'varchar', length: '80', isNullable: true },
          { name: 'clinicalSpecialty', type: 'varchar', length: '80', isNullable: true },
          { name: 'route', type: 'varchar', length: '255', isNullable: true },
          { name: 'launchType', type: 'varchar', length: '64', isNullable: true },
          { name: 'permissionPolicy', type: 'text', isNullable: true },
          { name: 'organizationTypes', type: 'text', default: "'[]'" },
          { name: 'roleProfiles', type: 'text', default: "'[]'" },
          { name: 'intendedRoles', type: 'text', default: "'[]'" },
          { name: 'workspaceTags', type: 'text', default: "'[]'" },
          { name: 'specialties', type: 'text', default: "'[]'" },
          { name: 'primaryDepartment', type: 'varchar', length: '80', isNullable: true },
          { name: 'secondaryDepartments', type: 'text', default: "'[]'" },
          { name: 'recommendedRoles', type: 'text', default: "'[]'" },
          { name: 'requiredPermissions', type: 'text', default: "'[]'" },
          { name: 'riskLevel', type: 'varchar', length: '32', isNullable: true },
          { name: 'backendStatus', type: 'varchar', length: '32', isNullable: true },
          { name: 'demoStatus', type: 'varchar', length: '32', isNullable: true },
          { name: 'governance', type: 'text', isNullable: true },
          { name: 'lifecycle', type: 'varchar', length: '32', default: "'active'" },
          { name: 'pricingTier', type: 'varchar', length: '32', default: "'standard'" },
          { name: 'packIds', type: 'text', default: "'[]'" },
          { name: 'dependencies', type: 'text', default: "'[]'" },
          { name: 'catalogVersion', type: 'varchar', length: '16', default: "'1.0.0'" },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'organization_entitlements',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'organizationId', type: 'varchar', length: '36' },
          { name: 'packId', type: 'varchar', length: '80' },
          { name: 'status', type: 'varchar', length: '32', default: "'enabled'" },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'platform_assets',
      new TableIndex({ name: 'IDX_platform_assets_assetType', columnNames: ['assetType'] }),
    );
    await queryRunner.createIndex(
      'platform_assets',
      new TableIndex({ name: 'IDX_platform_assets_lifecycle', columnNames: ['lifecycle'] }),
    );
    await queryRunner.createIndex(
      'organization_entitlements',
      new TableIndex({
        name: 'IDX_organization_entitlements_organizationId_packId',
        columnNames: ['organizationId', 'packId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('organization_entitlements', true);
    await queryRunner.dropTable('platform_assets', true);
    await queryRunner.dropTable('asset_packs', true);
    await queryRunner.dropTable('role_profiles', true);
  }
}
