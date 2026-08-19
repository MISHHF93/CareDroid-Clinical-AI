import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const INDEX_NAME = 'IDX_notification_preferences_userId_unique';

/**
 * HEAL-347.33: notification_preferences.userId had no unique index -- just
 * a plain FK. NotificationPreferenceService.getPreferences()/
 * updatePreferences() both do a findOne-then-create-if-missing sequence
 * with nothing enforcing "one row per user" at the database level. Two
 * concurrent calls that both see "no preferences yet" (e.g. a preference
 * PATCH racing a background notification send that lazily calls
 * getPreferences) can both insert a row for the same user; subsequent
 * findOne() calls then arbitrarily return whichever duplicate row the
 * database happens to return first, so a user's securityAlerts=false or
 * pushEnabled=false toggle can silently fail to take effect on a later
 * send if the "wrong" duplicate is read.
 *
 * userId is NOT NULL on this table (unlike the sentinel/integration-event
 * fixes), so a plain unique index is sufficient -- no NULL-handling
 * complication, no partial index needed.
 *
 * Pre-existing duplicates, if any (a live symptom of the very race this
 * migration closes), are deduped first, keeping the most recently updated
 * row per user, so the unique index can actually be created.
 */
export class AddNotificationPreferenceUserUniqueIndex1772703300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM notification_preferences
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC, id DESC) AS rn
          FROM notification_preferences
        ) ranked
        WHERE ranked.rn = 1
      )
    `);

    await queryRunner.createIndex(
      'notification_preferences',
      new TableIndex({
        name: INDEX_NAME,
        columnNames: ['userId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('notification_preferences', INDEX_NAME);
  }
}
