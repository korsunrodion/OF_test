import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1775496458645 implements MigrationInterface {
  name = 'Migration1775496458645';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."job_urls_status_enum" AS ENUM('queued', 'running', 'ok', 'error', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_urls" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jobId" uuid NOT NULL, "url" character varying NOT NULL, "status" "public"."job_urls_status_enum" NOT NULL DEFAULT 'queued', "error" text, "profileId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_37e2ec0c2ffcf70de6ea1a016a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_status_enum" AS ENUM('queued', 'running', 'done', 'failed', 'partial')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_priority_enum" AS ENUM('low', 'normal', 'high')`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'queued', "priority" "public"."jobs_priority_enum" NOT NULL DEFAULT 'normal', "total" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sourceUrl" character varying NOT NULL, "username" character varying, "displayName" character varying, "bio" text, "avatarUrl" character varying, "coverUrl" character varying, "publicStats" jsonb, "links" jsonb, "rawHtmlChecksum" character varying, "scrapedAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ef9834bbec32fffe73961f3788" ON "profiles" ("sourceUrl") `,
    );
    await queryRunner.query(
      `ALTER TABLE "job_urls" ADD CONSTRAINT "FK_b2c0c2e2e3c0d8719575451dd46" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_urls" DROP CONSTRAINT "FK_b2c0c2e2e3c0d8719575451dd46"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ef9834bbec32fffe73961f3788"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_status_enum"`);
    await queryRunner.query(`DROP TABLE "job_urls"`);
    await queryRunner.query(`DROP TYPE "public"."job_urls_status_enum"`);
  }
}
