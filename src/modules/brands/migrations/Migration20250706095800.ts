import { Migration } from '@mikro-orm/migrations';

export class Migration20250706095800 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_code_unique";`);
    this.addSql(`create table if not exists "brand" ("id" text not null, "name" text not null, "code" text not null, "logo_url" text null, "website_url" text null, "contact_email" text null, "contact_phone" text null, "description" text null, "country_of_origin" text null, "warranty_terms" text null, "authorized_dealer" boolean not null default false, "is_oem" boolean not null default true, "is_active" boolean not null default true, "display_order" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_code_unique" ON "brand" (code) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brand" cascade;`);
  }

}
