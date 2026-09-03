import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

const INDEX_NAME = 'IDX_two_factor_auth_userId_unique';

/**
 * two_factor_auth.userId had no unique index -- just a plain FK (see
 * AddUserProfilesUserIdIndex1772704000000's comment: unlike
 * biometric_configs.userId, which got an explicit index in
 * CreateCoreIdentitySchema, user_profiles/oauth_accounts/two_factor_auth did
 * not). TwoFactorService.enable() does a findOne-then-create-if-missing
 * sequence with nothing enforcing "one row per user" at the database level.
 * Two concurrent enable() calls for a user with no existing row (e.g. a
 * double-submitted enable request) can both find no row and both insert one;
 * verifyToken()/disable()/getStatus() then all do a plain
 * findOne({ where: { userId } }) that arbitrarily returns whichever
 * duplicate the database happens to return first, so a freshly-enabled
 * user's secret/backup codes can silently resolve to the "wrong" row on a
 * later login, or a disable() can leave a second, still-enabled row behind.
 *
 * userId is NOT NULL on this table, so a plain unique index is sufficient --
 * no NULL-handling complication, no partial index needed. Same shape as
 * AddNotificationPreferenceUserUniqueIndex1772703300000.
 *
 * Pre-existing duplicates, if any (a live symptom of the very race this
 * migration closes), are deduped first, keeping the most recently updated
 * row per user, so the unique index can actually be created.
 */
export class AddTwoFactorAuthUserUniqueIndex1772704200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM two_factor_auth
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC, id DESC) AS rn
          FROM two_factor_auth
        ) ranked
        WHERE ranked.rn = 1
      )
    `);

    await queryRunner.createIndex(
      'two_factor_auth',
      new TableIndex({
        name: INDEX_NAME,
        columnNames: ['userId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('two_factor_auth', INDEX_NAME);
  }
}
