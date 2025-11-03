import { Migration } from '@mikro-orm/migrations';

export class Migration20251103081427 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "supplier_import_template" ("id" text not null, "supplier_id" text not null, "name" text not null, "description" text null, "file_type" text check ("file_type" in ('csv', 'txt')) not null, "parse_config" jsonb not null, "column_mapping" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_import_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_import_template_deleted_at" ON "supplier_import_template" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_supplier_import_template_supplier_file_type" ON "supplier_import_template" (supplier_id, file_type) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "uniq_supplier_import_template_supplier_name" ON "supplier_import_template" (supplier_id, name) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "supplier_price_list_item" drop column if exists "supplier_sku", drop column if exists "lead_time_days";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "supplier_import_template" cascade;`);

    this.addSql(`alter table if exists "supplier_price_list_item" add column if not exists "supplier_sku" text null, add column if not exists "lead_time_days" integer null;`);
  }

}
