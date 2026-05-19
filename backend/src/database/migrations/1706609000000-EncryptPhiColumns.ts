import { MigrationInterface, QueryRunner, TableColumn, Table } from 'typeorm';

/**
 * Migration to add encrypted PHI columns
 *
 * This migration:
 * 1. Creates the encryption_keys table for key management
 * 2. Adds encrypted_* columns for sensitive fields in users table
 * 3. Adds encryption_key_version column to track which key was used
 *
 * The original fields are kept initially for backward compatibility during transition.
 * Once all data is encrypted and verified, original fields can be dropped in a follow-up migration.
 */
export class EncryptPhiColumns1706609000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create encryption_keys table (if not exists)
    const encryptionKeysTableExists = await queryRunner.hasTable('encryption_keys');
    if (!encryptionKeysTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'encryption_keys',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'keyVersion',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'keyMaterial',
              type: 'text',
              isNullable: false,
              comment: 'Encrypted key material - store in secure vault',
            },
            {
              name: 'algorithm',
              type: 'varchar',
              length: '50',
              isNullable: false,
              default: "'aes-256-gcm'",
            },
            {
              name: 'isActive',
              type: 'boolean',
              isNullable: false,
              default: false,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '50',
              isNullable: false,
              default: "'pending_rotation'",
            },
            {
              name: 'rotationReason',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'scheduledTime',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'progressPercentage',
              type: 'int',
              isNullable: false,
              default: 0,
            },
            {
              name: 'recordsProcessed',
              type: 'int',
              isNullable: false,
              default: 0,
            },
            {
              name: 'createdAt',
              type: 'datetime',
              isNullable: false,
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'activatedAt',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'deletionScheduledAt',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'auditInfo',
              type: 'text',
              isNullable: true,
            },
          ],
          indices: [
            {
              name: 'IDX_encryption_keys_keyVersion',
              columnNames: ['keyVersion'],
            },
            {
              name: 'IDX_encryption_keys_isActive',
              columnNames: ['isActive'],
            },
            {
              name: 'IDX_encryption_keys_status',
              columnNames: ['status'],
            },
          ],
        }),
      );
    }

    // 2. Add encrypted columns to users table (if they don't exist)
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      // Add encryption_key_version column
      if (!usersTable.findColumnByName('encryption_key_version')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'encryption_key_version',
            type: 'int',
            isNullable: true,
            default: null,
            comment: 'Which encryption key version was used for PHI fields',
          }),
        );
      }

      // Add encrypted email column
      if (!usersTable.findColumnByName('email_encrypted')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'email_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted email address (AES-256-GCM)',
          }),
        );
      }

      // Add encrypted phone column
      if (!usersTable.findColumnByName('phone_encrypted')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'phone_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted phone number (AES-256-GCM)',
          }),
        );
      }

      // Add encrypted SSN (4 last digits stored separately if needed)
      if (!usersTable.findColumnByName('ssn_encrypted')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'ssn_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted SSN (AES-256-GCM)',
          }),
        );
      }

      // Track encryption status
      if (!usersTable.findColumnByName('phi_fields_encrypted')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'phi_fields_encrypted',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Whether all PHI fields are encrypted',
          }),
        );
      }
    }

    // 3. Add encrypted columns to user_profiles table (if exists)
    const userProfilesTable = await queryRunner.getTable('user_profiles');
    if (userProfilesTable) {
      if (!userProfilesTable.findColumnByName('date_of_birth_encrypted')) {
        await queryRunner.addColumn(
          'user_profiles',
          new TableColumn({
            name: 'date_of_birth_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted date of birth (AES-256-GCM)',
          }),
        );
      }

      if (!userProfilesTable.findColumnByName('medical_history_encrypted')) {
        await queryRunner.addColumn(
          'user_profiles',
          new TableColumn({
            name: 'medical_history_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted medical history (AES-256-GCM)',
          }),
        );
      }

      if (!userProfilesTable.findColumnByName('allergies_encrypted')) {
        await queryRunner.addColumn(
          'user_profiles',
          new TableColumn({
            name: 'allergies_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted allergies (AES-256-GCM)',
          }),
        );
      }

      if (!userProfilesTable.findColumnByName('medications_encrypted')) {
        await queryRunner.addColumn(
          'user_profiles',
          new TableColumn({
            name: 'medications_encrypted',
            type: 'bytea',
            isNullable: true,
            comment: 'Encrypted medications list (AES-256-GCM)',
          }),
        );
      }

      if (!userProfilesTable.findColumnByName('encryption_key_version')) {
        await queryRunner.addColumn(
          'user_profiles',
          new TableColumn({
            name: 'encryption_key_version',
            type: 'int',
            isNullable: true,
            comment: 'Which encryption key version was used',
          }),
        );
      }
    }

    console.log('✅ Migration complete: Encrypted PHI columns added');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop encryption_keys table
    await queryRunner.dropTable('encryption_keys', true);

    // Drop encrypted columns from users table
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const columnsToRemove = [
        'email_encrypted',
        'phone_encrypted',
        'ssn_encrypted',
        'encryption_key_version',
        'phi_fields_encrypted',
      ];

      for (const columnName of columnsToRemove) {
        if (usersTable.findColumnByName(columnName)) {
          await queryRunner.dropColumn('users', columnName);
        }
      }
    }

    // Drop encrypted columns from user_profiles table
    const userProfilesTable = await queryRunner.getTable('user_profiles');
    if (userProfilesTable) {
      const columnsToRemove = [
        'date_of_birth_encrypted',
        'medical_history_encrypted',
        'allergies_encrypted',
        'medications_encrypted',
        'encryption_key_version',
      ];

      for (const columnName of columnsToRemove) {
        if (userProfilesTable.findColumnByName(columnName)) {
          await queryRunner.dropColumn('user_profiles', columnName);
        }
      }
    }

    console.log('✅ Migration rolled back: Encrypted PHI columns removed');
  }
}
