import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogsTimestampIndex1788585115708 implements MigrationInterface {
  name = 'AddAuditLogsTimestampIndex1788585115708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "IDX_88dcc148d532384790ab874c3d" ON "audit_logs" ("timestamp")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IDX_88dcc148d532384790ab874c3d"
        `);
  }
}
