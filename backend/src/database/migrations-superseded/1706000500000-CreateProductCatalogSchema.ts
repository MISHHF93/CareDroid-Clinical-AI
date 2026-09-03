import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateProductCatalogSchema1706000500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'slug', type: 'varchar', length: '120', isUnique: true },
          { name: 'name', type: 'varchar', length: '180' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'productType', type: 'varchar', length: '64' },
          { name: 'packIds', type: 'text', default: "'[]'" },
          { name: 'highlightAssetIds', type: 'text', default: "'[]'" },
          { name: 'outcomes', type: 'text', default: "'[]'" },
          { name: 'targetBuyers', type: 'text', default: "'[]'" },
          { name: 'buyerPersona', type: 'text', default: "'[]'" },
          { name: 'decisionMaker', type: 'text', default: "'[]'" },
          { name: 'stakeholders', type: 'text', default: "'[]'" },
          { name: 'expectedOutcomes', type: 'text', default: "'[]'" },
          { name: 'targetUsers', type: 'text', default: "'[]'" },
          { name: 'requiredBackendCapabilities', type: 'text', default: "'[]'" },
          { name: 'requiredIntegrations', type: 'text', default: "'[]'" },
          { name: 'aiWorkflows', type: 'text', default: "'[]'" },
          { name: 'dashboards', type: 'text', default: "'[]'" },
          { name: 'pricingTierPlaceholder', type: 'varchar', length: '64', isNullable: true },
          { name: 'readinessLabels', type: 'text', default: "'[]'" },
          { name: 'complexity', type: 'varchar', length: '32', isNullable: true },
          { name: 'commercialPlanIds', type: 'text', default: "'[]'" },
          { name: 'isPublished', type: 'boolean', default: true },
          { name: 'sortOrder', type: 'int', default: 0 },
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
        name: 'commercial_plans',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'name', type: 'varchar', length: '180' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'includedProductIds', type: 'text', default: "'[]'" },
          { name: 'includedPackIds', type: 'text', default: "'[]'" },
          { name: 'maxPackIds', type: 'text', default: "'[]'" },
          { name: 'pricingTier', type: 'varchar', length: '32', default: "'standard'" },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'sortOrder', type: 'int', default: 0 },
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
        name: 'care_pathways',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'slug', type: 'varchar', length: '120', isUnique: true },
          { name: 'name', type: 'varchar', length: '180' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'calculatorAssetIds', type: 'text', default: "'[]'" },
          { name: 'protocolAssetIds', type: 'text', default: "'[]'" },
          { name: 'workflowAssetIds', type: 'text', default: "'[]'" },
          { name: 'simulationAssetIds', type: 'text', default: "'[]'" },
          { name: 'aiAgentId', type: 'varchar', length: '80', isNullable: true },
          { name: 'outcomes', type: 'text', default: "'[]'" },
          { name: 'sortOrder', type: 'int', default: 0 },
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
        name: 'integration_offerings',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'slug', type: 'varchar', length: '120', isUnique: true },
          { name: 'name', type: 'varchar', length: '180' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'category', type: 'varchar', length: '64' },
          { name: 'status', type: 'varchar', length: '32', default: "'roadmap'" },
          { name: 'linkedAssetId', type: 'varchar', length: '80', isNullable: true },
          { name: 'docsUrl', type: 'varchar', length: '512', isNullable: true },
          { name: 'sortOrder', type: 'int', default: 0 },
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
        name: 'specialty_catalog',
        columns: [
          { name: 'id', type: 'varchar', length: '80', isPrimary: true },
          { name: 'slug', type: 'varchar', length: '120', isUnique: true },
          { name: 'name', type: 'varchar', length: '180' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'assetIds', type: 'text', default: "'[]'" },
          { name: 'protocolAssetIds', type: 'text', default: "'[]'" },
          { name: 'simulationAssetIds', type: 'text', default: "'[]'" },
          { name: 'workflowAssetIds', type: 'text', default: "'[]'" },
          { name: 'dashboardAssetIds', type: 'text', default: "'[]'" },
          { name: 'defaultAiAgentId', type: 'varchar', length: '80', isNullable: true },
          { name: 'sortOrder', type: 'int', default: 0 },
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('specialty_catalog', true);
    await queryRunner.dropTable('integration_offerings', true);
    await queryRunner.dropTable('care_pathways', true);
    await queryRunner.dropTable('commercial_plans', true);
    await queryRunner.dropTable('products', true);
  }
}
