import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1775549240909 implements MigrationInterface {
  name = 'Migration1775549240909';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "rawHtmlChecksum"`);
    await queryRunner.query(`ALTER TABLE "job_urls" ADD "rawHtmlChecksum" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_urls" DROP COLUMN "rawHtmlChecksum"`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD "rawHtmlChecksum" character varying`);
  }
}
