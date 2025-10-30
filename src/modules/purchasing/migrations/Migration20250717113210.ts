import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250717113210 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "supplier_price_list" ("id" text not null, "supplier_id" text not null, "name" text not null, "description" text null, "effective_date" timestamptz null, "expiry_date" timestamptz null, "is_active" boolean not null default true, "version" integer not null default 1, "currency_code" text not null default 'USD', "upload_filename" text null, "upload_metadata" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_price_list_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_deleted_at" ON "supplier_price_list" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "supplier_active_price_list_idx" ON "supplier_price_list" (supplier_id, is_active) WHERE is_active = true AND deleted_at IS NULL;`);

    this.addSql(`create table if not exists "supplier_price_list_item" ("id" text not null, "price_list_id" text not null, "product_variant_id" text not null, "product_id" text not null, "supplier_sku" text null, "variant_sku" text null, "cost_price" numeric not null, "quantity" integer not null default 1, "lead_time_days" integer null, "notes" text null, "metadata" jsonb null, "raw_cost_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_price_list_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_item_deleted_at" ON "supplier_price_list_item" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "supplier_price_list" cascade;`);

    this.addSql(`drop table if exists "supplier_price_list_item" cascade;`);
  }

}
