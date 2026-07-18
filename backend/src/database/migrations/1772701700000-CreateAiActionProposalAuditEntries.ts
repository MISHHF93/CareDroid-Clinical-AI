import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAiActionProposalAuditEntries1772701700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_action_proposal_audit_entries',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'proposalId', type: 'varchar', length: '36' },
          { name: 'sequenceIndex', type: 'int' },
          { name: 'fromState', type: 'varchar', length: '20', isNullable: true },
          { name: 'toState', type: 'varchar', length: '20' },
          { name: 'actorUserId', type: 'varchar', length: '64', isNullable: true },
          { name: 'occurredAt', type: 'varchar', length: '32' },
          { name: 'metadataJson', type: 'text', isNullable: true },
          { name: 'previousHash', type: 'varchar', length: '64', isNullable: true },
          { name: 'entryHash', type: 'varchar', length: '64' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ai_action_proposal_audit_entries',
      new TableIndex({
        name: 'IDX_ai_action_proposal_audit_proposal_seq',
        columnNames: ['proposalId', 'sequenceIndex'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_action_proposal_audit_entries', true);
  }
}
