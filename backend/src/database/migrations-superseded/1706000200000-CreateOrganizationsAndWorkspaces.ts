import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

export class CreateOrganizationsAndWorkspaces1706000200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'slug', type: 'varchar', length: '120', isUnique: true },
          { name: 'organizationType', type: 'varchar', length: '64', default: "'hospital'" },
          { name: 'country', type: 'varchar', length: '120', isNullable: true },
          { name: 'branding', type: 'text', isNullable: true },
          { name: 'settings', type: 'text', isNullable: true },
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
        name: 'workspaces',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'type', type: 'varchar', length: '32' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'slug', type: 'varchar', length: '160', isUnique: true },
          { name: 'organizationId', type: 'varchar', length: '36', isNullable: true },
          { name: 'parentWorkspaceId', type: 'varchar', length: '36', isNullable: true },
          { name: 'ownerUserId', type: 'varchar', length: '36', isNullable: true },
          { name: 'branding', type: 'text', isNullable: true },
          { name: 'settings', type: 'text', isNullable: true },
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
        name: 'workspace_memberships',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'workspaceId', type: 'varchar', length: '36' },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'role', type: 'varchar', length: '32', default: "'viewer'" },
          { name: 'permissions', type: 'text', isNullable: true },
          { name: 'teams', type: 'text', isNullable: true },
          { name: 'department', type: 'varchar', length: '120', isNullable: true },
          { name: 'status', type: 'varchar', length: '32', default: "'active'" },
          { name: 'joinedAt', type: dateTimeColumnType(queryRunner), isNullable: true },
          { name: 'lastAccessedAt', type: dateTimeColumnType(queryRunner), isNullable: true },
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
        name: 'workspace_invitations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'workspaceId', type: 'varchar', length: '36' },
          { name: 'email', type: 'varchar', length: '255' },
          { name: 'role', type: 'varchar', length: '60' },
          { name: 'invitedByUserId', type: 'varchar', length: '36' },
          { name: 'status', type: 'varchar', length: '32', default: "'pending'" },
          { name: 'expiresAt', type: dateTimeColumnType(queryRunner), isNullable: true },
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
        name: 'user_workspace_states',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'activeWorkspaceId', type: 'varchar', length: '36', isNullable: true },
          { name: 'recentWorkspaceIds', type: 'text', isNullable: true },
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
        name: 'organization_memberships',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          { name: 'organizationId', type: 'varchar', length: '36' },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'role', type: 'varchar', length: '32', default: "'member'" },
          { name: 'roleProfileId', type: 'varchar', length: '80', isNullable: true },
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
      'workspaces',
      new TableIndex({ name: 'IDX_workspaces_type_slug', columnNames: ['type', 'slug'] }),
    );
    await queryRunner.createIndex(
      'workspace_memberships',
      new TableIndex({
        name: 'IDX_workspace_memberships_workspaceId_userId',
        columnNames: ['workspaceId', 'userId'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'workspace_memberships',
      new TableIndex({
        name: 'IDX_workspace_memberships_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'workspace_invitations',
      new TableIndex({
        name: 'IDX_workspace_invitations_workspaceId_email',
        columnNames: ['workspaceId', 'email'],
      }),
    );
    await queryRunner.createIndex(
      'user_workspace_states',
      new TableIndex({
        name: 'IDX_user_workspace_states_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'organization_memberships',
      new TableIndex({
        name: 'IDX_organization_memberships_organizationId_userId',
        columnNames: ['organizationId', 'userId'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'workspaces',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'workspace_memberships',
      new TableForeignKey({
        columnNames: ['workspaceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'workspaces',
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'workspace_memberships',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('organization_memberships', true);
    await queryRunner.dropTable('user_workspace_states', true);
    await queryRunner.dropTable('workspace_invitations', true);
    await queryRunner.dropTable('workspace_memberships', true);
    await queryRunner.dropTable('workspaces', true);
    await queryRunner.dropTable('organizations', true);
  }
}
