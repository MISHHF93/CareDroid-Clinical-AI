import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Performance sweep finding: `user_profiles.userId` has a FOREIGN KEY
 * (added by CreateCoreIdentitySchema, 1772700000000) but no index -- unlike
 * `biometric_configs.userId`, which got an explicit index in that same
 * migration, `user_profiles`/`oauth_accounts`/`two_factor_auth` did not.
 *
 * `user_profiles.userId` is the hottest of the three by a wide margin:
 * `TenantContextService.resolveForRequest()` (tenant-context.service.ts)
 * does `profileRepository.findOne({ where: { userId } })` on essentially
 * every read, and `TenantContextInterceptor` is a GLOBAL `APP_INTERCEPTOR`
 * (tenant-context.module.ts) that runs on every authenticated HTTP request
 * across the whole backend. AuthService, UsersService, OrganizationsService,
 * PlatformContextService, and others all do the same unindexed
 * `findOne({ where: { userId } })` lookup on their own request paths too.
 * Without an index this is a full table scan of `user_profiles` on nearly
 * every API call as the user base grows -- one of the highest-yield single
 * indexes available in this schema.
 */
export class AddUserProfilesUserIdIndex1772704000000 implements MigrationInterface {
  private readonly table = 'user_profiles';
  private readonly indexName = 'IDX_user_profiles_userId';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      this.table,
      new TableIndex({ name: this.indexName, columnNames: ['userId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(this.table, this.indexName);
  }
}
