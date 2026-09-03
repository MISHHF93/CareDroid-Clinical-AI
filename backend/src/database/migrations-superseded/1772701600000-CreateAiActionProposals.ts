import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAiActionProposals1772701600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_action_proposals',
        columns: [
          { name: 'proposalId', type: 'varchar', length: '36', isPrimary: true },
          { name: 'organizationId', type: 'varchar', length: '36', isNullable: true },
          { name: 'state', type: 'varchar', length: '20' },
          { name: 'updatedAt', type: 'varchar', length: '32' },
          { name: 'payload', type: 'text' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ai_action_proposals',
      new TableIndex({
        name: 'IDX_ai_action_proposals_org_state',
        columnNames: ['organizationId', 'state'],
      }),
    );
    await queryRunner.createIndex(
      'ai_action_proposals',
      new TableIndex({
        name: 'IDX_ai_action_proposals_updated',
        columnNames: ['updatedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_action_proposals', true);
  }
}
