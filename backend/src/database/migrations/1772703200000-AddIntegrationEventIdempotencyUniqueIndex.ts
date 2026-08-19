import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const SCOPED_INDEX_NAME = 'IDX_integration_event_records_org_source_idempotency_unique';
const NULL_ORG_INDEX_NAME = 'IDX_integration_event_records_source_idempotency_unique_no_org';

/**
 * HEAL-347.32: integration_event_records had only a plain (non-unique)
 * index on idempotencyKey -- IntegrationHubService.ingest()'s
 * findOne-then-save idempotency check was a pure application-level TOCTOU.
 * Two near-simultaneous retried deliveries of the same FHIR/HL7/lab/device
 * event (routine for flaky integration engines) could both read "not
 * found" and both insert, double-firing the automation router/SafeAction
 * for one real clinical event (duplicate review-queue items/notifications).
 *
 * Two partial unique indexes, mirroring the service's own query shape
 * exactly (organizationId, sourceSystem, idempotencyKey) rather than one
 * plain composite index: idempotencyKey is optional (the service's own
 * `if (idempotencyKey)` guard skips the whole dedup check when it's
 * absent -- WHERE ... IS NOT NULL matches that), and organizationId is
 * nullable, and SQL treats every NULL as distinct from every other NULL in
 * a unique constraint, so a naive composite index would silently stop
 * deduplicating whenever organizationId is null. Same pattern as
 * ScopeSentinelInboundPatientUniqueIndexByOrganization (HEAL-347.26).
 *
 * Pre-existing duplicate (organizationId, sourceSystem, idempotencyKey)
 * rows, if any (a live symptom of the very race this migration closes),
 * are deduped first, keeping the most recently updated row, so the unique
 * indexes can actually be created.
 */
export class AddIntegrationEventIdempotencyUniqueIndex1772703200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM integration_event_records
      WHERE "idempotencyKey" IS NOT NULL
        AND id NOT IN (
          SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                     PARTITION BY "organizationId", "sourceSystem", "idempotencyKey"
                     ORDER BY "updatedAt" DESC, id DESC
                   ) AS rn
            FROM integration_event_records
            WHERE "idempotencyKey" IS NOT NULL
          ) ranked
          WHERE ranked.rn = 1
        )
    `);

    await queryRunner.createIndex(
      'integration_event_records',
      new TableIndex({
        name: SCOPED_INDEX_NAME,
        columnNames: ['organizationId', 'sourceSystem', 'idempotencyKey'],
        isUnique: true,
        where: '"organizationId" IS NOT NULL AND "idempotencyKey" IS NOT NULL',
      }),
    );
    await queryRunner.createIndex(
      'integration_event_records',
      new TableIndex({
        name: NULL_ORG_INDEX_NAME,
        columnNames: ['sourceSystem', 'idempotencyKey'],
        isUnique: true,
        where: '"organizationId" IS NULL AND "idempotencyKey" IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('integration_event_records', NULL_ORG_INDEX_NAME);
    await queryRunner.dropIndex('integration_event_records', SCOPED_INDEX_NAME);
  }
}
