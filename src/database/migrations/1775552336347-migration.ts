import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1775552336347 implements MigrationInterface {
  name = 'Migration1775552336347';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_urls" ADD "pageHtml" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_urls" DROP COLUMN "pageHtml"`);
  }
}
