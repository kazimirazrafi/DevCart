import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261021152316 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "email_verification" drop constraint if exists "email_verification_email_unique";`);
    this.addSql(`create table if not exists "email_verification" ("id" text not null, "email" text not null, "code_hash" text null, "expires_at" timestamptz null, "attempts" integer not null default 0, "last_sent_at" timestamptz null, "window_started_at" timestamptz null, "window_sent_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_verification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_verification_deleted_at" ON "email_verification" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_verification_email_unique" ON "email_verification" ("email") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_verification" cascade;`);
  }

}
