import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { binaryColumnType, dateTimeColumnType } from '../portable-column-types';

/**
 * Creates the core identity/auth tables that every prior migration assumed
 * already existed via `synchronize: true`. On a real Postgres deployment
 * (migrationsRun: true, synchronize: false) none of these tables were ever
 * created, so this is the foundational schema every later migration/FK
 * (e.g. ai_queries.userId -> users.id) depends on.
 */
export class CreateCoreIdentitySchema1706000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'emailEncrypted', type: binaryColumnType(queryRunner), isNullable: true },
          { name: 'passwordHash', type: 'varchar', length: '255', isNullable: true },
          { name: 'emailVerified', type: 'boolean', default: false },
          { name: 'emailVerificationToken', type: 'varchar', length: '64', isNullable: true },
          {
            name: 'emailVerificationExpiry',
            type: dateTimeColumnType(queryRunner),
            isNullable: true,
          },
          { name: 'passwordResetToken', type: 'varchar', length: '64', isNullable: true },
          { name: 'passwordResetExpiry', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'role', type: 'varchar', length: '32', default: "'student'" },
          { name: 'lastLoginAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'lastLoginIp', type: 'varchar', length: '45', isNullable: true },
          { name: 'phoneEncrypted', type: binaryColumnType(queryRunner), isNullable: true },
          { name: 'ssnEncrypted', type: binaryColumnType(queryRunner), isNullable: true },
          { name: 'encryptionKeyVersion', type: 'int', isNullable: true },
          { name: 'phiFieldsEncrypted', type: 'boolean', default: false },
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
        name: 'user_profiles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'fullName', type: 'varchar', length: '255' },
          { name: 'firstName', type: 'varchar', length: '128', isNullable: true },
          { name: 'lastName', type: 'varchar', length: '128', isNullable: true },
          { name: 'institution', type: 'varchar', length: '255', isNullable: true },
          { name: 'organizationId', type: 'varchar', length: '36', isNullable: true },
          { name: 'roleProfileId', type: 'varchar', length: '80', isNullable: true },
          { name: 'specialty', type: 'varchar', length: '100', isNullable: true },
          { name: 'licenseNumber', type: 'varchar', length: '255', isNullable: true },
          { name: 'country', type: 'varchar', length: '50', isNullable: true },
          { name: 'languagePreference', type: 'varchar', length: '10', isNullable: true },
          { name: 'timezone', type: 'varchar', length: '50', isNullable: true },
          { name: 'verified', type: 'boolean', default: false },
          { name: 'trustScore', type: 'integer', default: 0 },
          { name: 'avatarUrl', type: 'text', isNullable: true },
          { name: 'dateOfBirthEncrypted', type: binaryColumnType(queryRunner), isNullable: true },
          {
            name: 'medicalHistoryEncrypted',
            type: binaryColumnType(queryRunner),
            isNullable: true,
          },
          { name: 'allergiesEncrypted', type: binaryColumnType(queryRunner), isNullable: true },
          { name: 'medicationsEncrypted', type: binaryColumnType(queryRunner), isNullable: true },
          { name: 'encryptionKeyVersion', type: 'int', isNullable: true },
          { name: 'consentMarketingCommunications', type: 'boolean', default: false },
          { name: 'consentDataProcessing', type: 'boolean', default: false },
          { name: 'consentThirdPartySharing', type: 'boolean', default: false },
          { name: 'consentEssentialCookies', type: 'boolean', default: true },
          {
            name: 'consentMarketingUpdatedAt',
            type: dateTimeColumnType(queryRunner),
            isNullable: true,
          },
          {
            name: 'consentDataProcessingUpdatedAt',
            type: dateTimeColumnType(queryRunner),
            isNullable: true,
          },
          {
            name: 'consentThirdPartySharingUpdatedAt',
            type: dateTimeColumnType(queryRunner),
            isNullable: true,
          },
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
        name: 'oauth_accounts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'provider', type: 'varchar', length: '32' },
          { name: 'providerAccountId', type: 'varchar', length: '255' },
          { name: 'accessToken', type: 'varchar', length: '255', isNullable: true },
          { name: 'refreshToken', type: 'varchar', length: '255', isNullable: true },
          { name: 'tokenExpiry', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'two_factor_auth',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'enabled', type: 'boolean', default: false },
          { name: 'secret', type: 'varchar', length: '255', isNullable: true },
          { name: 'backupCodes', type: 'text', isNullable: true },
          { name: 'lastUsedAt', type: dateTimeColumnType(queryRunner), isNullable: true },
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
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'token', type: 'text' },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'expires_at', type: dateTimeColumnType(queryRunner) },
          { name: 'revoked', type: 'boolean', default: false },
          {
            name: 'created_at',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'biometric_configs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'isEnabled', type: 'boolean', default: false },
          { name: 'biometricType', type: 'varchar', length: '16', isNullable: true },
          { name: 'deviceId', type: 'varchar', length: '500', isNullable: true },
          { name: 'deviceName', type: 'varchar', length: '255', isNullable: true },
          { name: 'challengeToken', type: 'varchar', length: '500', isNullable: true },
          { name: 'lastUsedAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'usageCount', type: 'int', default: 0 },
          { name: 'failedAttempts', type: 'int', default: 0 },
          { name: 'lockedUntil', type: dateTimeColumnType(queryRunner), isNullable: true },
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

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({ name: 'IDX_refresh_tokens_token', columnNames: ['token'] }),
    );
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_user_id_expires_at',
        columnNames: ['user_id', 'expires_at'],
      }),
    );
    await queryRunner.createIndex(
      'biometric_configs',
      new TableIndex({ name: 'IDX_biometric_configs_userId', columnNames: ['userId'] }),
    );

    for (const [table, column] of [
      ['user_profiles', 'userId'],
      ['oauth_accounts', 'userId'],
      ['two_factor_auth', 'userId'],
      ['refresh_tokens', 'user_id'],
      ['biometric_configs', 'userId'],
    ]) {
      await queryRunner.createForeignKey(
        table,
        new TableForeignKey({
          columnNames: [column],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('biometric_configs', true);
    await queryRunner.dropTable('refresh_tokens', true);
    await queryRunner.dropTable('two_factor_auth', true);
    await queryRunner.dropTable('oauth_accounts', true);
    await queryRunner.dropTable('user_profiles', true);
    await queryRunner.dropTable('users', true);
  }
}
