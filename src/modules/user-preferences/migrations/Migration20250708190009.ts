import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250708190009 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "user_preferences" drop constraint if exists "user_preferences_user_id_unique";`);
    this.addSql(`create table if not exists "user_preferences" ("id" text not null, "user_id" text not null, "language" text not null default 'en', "timezone" text null, "currency" text null, "date_format" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "user_preferences_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_preferences_deleted_at" ON "user_preferences" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_preferences_user_id_unique" ON "user_preferences" (user_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "user_preferences" cascade;`);
  }

}
