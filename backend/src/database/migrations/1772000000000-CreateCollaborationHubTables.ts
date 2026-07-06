import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCollaborationHubTables1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'collaboration_channels',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'organizationId', type: 'varchar', length: '64' },
          { name: 'workspaceId', type: 'uuid', isNullable: true },
          { name: 'type', type: 'varchar', length: '40' },
          { name: 'name', type: 'varchar', length: '160' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'departmentKey', type: 'varchar', length: '64', isNullable: true },
          { name: 'patientId', type: 'varchar', length: '96', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'isSystemManaged', type: 'boolean', default: false },
          { name: 'incidentSeverity', type: 'varchar', length: '40', isNullable: true },
          { name: 'incidentTriggerType', type: 'varchar', length: '80', isNullable: true },
          { name: 'incidentSourceId', type: 'varchar', length: '96', isNullable: true },
          { name: 'createdByUserId', type: 'uuid', isNullable: true },
          { name: 'retentionPolicyDays', type: 'int', isNullable: true },
          { name: 'archivedAt', type: 'timestamp', isNullable: true },
          { name: 'resolvedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'collaboration_channel_memberships',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'channelId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'role', type: 'varchar', length: '20', default: "'member'" },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'notificationPreference', type: 'varchar', length: '20', default: "'all'" },
          { name: 'lastReadMessageId', type: 'uuid', isNullable: true },
          { name: 'lastReadAt', type: 'timestamp', isNullable: true },
          { name: 'joinedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'collaboration_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'channelId', type: 'uuid' },
          { name: 'threadRootId', type: 'uuid', isNullable: true },
          { name: 'senderId', type: 'uuid', isNullable: true },
          { name: 'senderType', type: 'varchar', length: '20', default: "'user'" },
          { name: 'body', type: 'text' },
          { name: 'mentionedUserIds', type: 'text', isNullable: true },
          { name: 'pinnedAt', type: 'timestamp', isNullable: true },
          { name: 'pinnedByUserId', type: 'uuid', isNullable: true },
          { name: 'sourceType', type: 'varchar', length: '40', isNullable: true },
          { name: 'sourceId', type: 'varchar', length: '96', isNullable: true },
          { name: 'editedAt', type: 'timestamp', isNullable: true },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
          { name: 'deletedByUserId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'collaboration_message_reactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'messageId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'emoji', type: 'varchar', length: '16' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'collaboration_attachments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'messageId', type: 'uuid' },
          { name: 'fileName', type: 'varchar', length: '255' },
          { name: 'mimeType', type: 'varchar', length: '120' },
          { name: 'kind', type: 'varchar', length: '20', default: "'file'" },
          { name: 'sizeBytes', type: 'int' },
          { name: 'storageProvider', type: 'varchar', length: '40', default: "'local'" },
          { name: 'storageKey', type: 'varchar', length: '500' },
          { name: 'url', type: 'varchar', length: '1000', isNullable: true },
          { name: 'uploadedByUserId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'collaboration_external_links',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'channelId', type: 'uuid' },
          { name: 'provider', type: 'varchar', length: '20' },
          { name: 'externalChannelId', type: 'varchar', length: '255', isNullable: true },
          { name: 'config', type: 'text', isNullable: true },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'collaboration_channels',
      new TableIndex({
        name: 'IDX_collab_channels_org_type',
        columnNames: ['organizationId', 'type'],
      }),
    );
    await queryRunner.createIndex(
      'collaboration_channels',
      new TableIndex({
        name: 'IDX_collab_channels_org_department',
        columnNames: ['organizationId', 'departmentKey'],
      }),
    );
    await queryRunner.createIndex(
      'collaboration_channels',
      new TableIndex({ name: 'IDX_collab_channels_patient', columnNames: ['patientId'] }),
    );
    await queryRunner.createIndex(
      'collaboration_channel_memberships',
      new TableIndex({
        name: 'IDX_collab_memberships_channel_user',
        columnNames: ['channelId', 'userId'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'collaboration_channel_memberships',
      new TableIndex({
        name: 'IDX_collab_memberships_user_status',
        columnNames: ['userId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'collaboration_messages',
      new TableIndex({
        name: 'IDX_collab_messages_channel_created',
        columnNames: ['channelId', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'collaboration_messages',
      new TableIndex({ name: 'IDX_collab_messages_thread_root', columnNames: ['threadRootId'] }),
    );
    await queryRunner.createIndex(
      'collaboration_message_reactions',
      new TableIndex({
        name: 'IDX_collab_reactions_message_user_emoji',
        columnNames: ['messageId', 'userId', 'emoji'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'collaboration_attachments',
      new TableIndex({ name: 'IDX_collab_attachments_message', columnNames: ['messageId'] }),
    );
    await queryRunner.createIndex(
      'collaboration_external_links',
      new TableIndex({
        name: 'IDX_collab_external_links_channel_provider',
        columnNames: ['channelId', 'provider'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'collaboration_external_links',
      'IDX_collab_external_links_channel_provider',
    );
    await queryRunner.dropIndex('collaboration_attachments', 'IDX_collab_attachments_message');
    await queryRunner.dropIndex(
      'collaboration_message_reactions',
      'IDX_collab_reactions_message_user_emoji',
    );
    await queryRunner.dropIndex('collaboration_messages', 'IDX_collab_messages_thread_root');
    await queryRunner.dropIndex('collaboration_messages', 'IDX_collab_messages_channel_created');
    await queryRunner.dropIndex(
      'collaboration_channel_memberships',
      'IDX_collab_memberships_user_status',
    );
    await queryRunner.dropIndex(
      'collaboration_channel_memberships',
      'IDX_collab_memberships_channel_user',
    );
    await queryRunner.dropIndex('collaboration_channels', 'IDX_collab_channels_patient');
    await queryRunner.dropIndex('collaboration_channels', 'IDX_collab_channels_org_department');
    await queryRunner.dropIndex('collaboration_channels', 'IDX_collab_channels_org_type');
    await queryRunner.dropTable('collaboration_external_links');
    await queryRunner.dropTable('collaboration_attachments');
    await queryRunner.dropTable('collaboration_message_reactions');
    await queryRunner.dropTable('collaboration_messages');
    await queryRunner.dropTable('collaboration_channel_memberships');
    await queryRunner.dropTable('collaboration_channels');
  }
}
