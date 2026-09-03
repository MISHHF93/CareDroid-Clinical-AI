import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

/**
 * Closes a real schema-drift defect: `AIQuery` (ai-query.entity.ts) has always
 * declared organizationId, workspaceId, assetId, agentId, modelClass,
 * modelVersion, routingExpert, retrievalPolicy, requiresHumanReview, and
 * estimatedCost, but the original CreateAIQueryTable migration never created
 * them. `ai.service.ts` actively queries and writes several of these
 * (e.g. `WHERE aiQuery.organizationId = :organizationId`) — on a real
 * migration-managed Postgres deployment this throws "column does not exist".
 * Since organizationId/workspaceId are exactly the tenant-scoping columns,
 * this was a live tenant-isolation gap at the persistence layer, not cosmetic.
 */
export class AddAIQueryTenantAndRoutingColumns1772600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('ai_queries', [
      new TableColumn({ name: 'organizationId', type: 'varchar', length: '36', isNullable: true }),
      new TableColumn({ name: 'workspaceId', type: 'varchar', length: '36', isNullable: true }),
      new TableColumn({ name: 'assetId', type: 'varchar', length: '100', isNullable: true }),
      new TableColumn({ name: 'agentId', type: 'varchar', length: '100', isNullable: true }),
      new TableColumn({ name: 'modelClass', type: 'varchar', length: '50', isNullable: true }),
      new TableColumn({ name: 'modelVersion', type: 'varchar', length: '100', isNullable: true }),
      new TableColumn({ name: 'routingExpert', type: 'varchar', length: '100', isNullable: true }),
      new TableColumn({ name: 'retrievalPolicy', type: 'varchar', length: '50', isNullable: true }),
      new TableColumn({ name: 'requiresHumanReview', type: 'boolean', default: false }),
      new TableColumn({
        name: 'estimatedCost',
        type: 'decimal',
        precision: 10,
        scale: 6,
        isNullable: true,
      }),
    ]);

    // organizationId is the primary tenant-scoping filter `ai.service.ts` queries
    // by directly — index it so that filtering doesn't silently become a full
    // table scan as this table grows.
    await queryRunner.query(
      'CREATE INDEX "IDX_ai_queries_organizationId_createdAt" ON "ai_queries" ("organizationId", "createdAt")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_ai_queries_organizationId_createdAt"');

    // SQLite implements dropColumns via a full table recreate, which restates
    // every live constraint — including ai_queries' FK to users (added by the
    // original CreateAIQueryTable migration). Drop it first so the recreate
    // doesn't reference `users`, which a fuller revert may have already torn
    // down; restore it afterward only if `users` still exists.
    const table = await queryRunner.getTable('ai_queries');
    const userFk = table?.foreignKeys.find((fk) => fk.columnNames.includes('userId'));
    if (userFk) {
      await queryRunner.dropForeignKey('ai_queries', userFk);
    }

    await queryRunner.dropColumns('ai_queries', [
      'organizationId',
      'workspaceId',
      'assetId',
      'agentId',
      'modelClass',
      'modelVersion',
      'routingExpert',
      'retrievalPolicy',
      'requiresHumanReview',
      'estimatedCost',
    ]);

    if (userFk && (await queryRunner.hasTable('users'))) {
      await queryRunner.createForeignKey(
        'ai_queries',
        new TableForeignKey({
          columnNames: ['userId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }
}
