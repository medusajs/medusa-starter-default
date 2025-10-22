import { Migration } from '@mikro-orm/migrations';

export class Migration20251022133025 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order_item" add constraint "purchase_order_item_purchase_order_id_foreign" foreign key ("purchase_order_id") references "purchase_order" ("id") on update cascade;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_item_purchase_order_id" ON "purchase_order_item" (purchase_order_id) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "supplier" add column if not exists "is_pricing_source" boolean not null default false, add column if not exists "pricing_priority" integer not null default 0, add column if not exists "auto_sync_prices" boolean not null default false;`);

    this.addSql(`drop index if exists "supplier_active_price_list_idx";`);

    this.addSql(`alter table if exists "supplier_price_list" add column if not exists "brand_id" text null;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "supplier_active_price_list_brand_idx" ON "supplier_price_list" (supplier_id, brand_id, is_active) WHERE is_active = true AND deleted_at IS NULL;`);

    this.addSql(`alter table if exists "supplier_price_list_item" drop column if exists "discount_amount", drop column if exists "raw_discount_amount";`);

    this.addSql(`alter table if exists "supplier_price_list_item" add column if not exists "discount_code" text null, add column if not exists "description" text null, add column if not exists "category" text null, add column if not exists "last_synced_at" timestamptz null, add column if not exists "sync_status" text null, add column if not exists "sync_error" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order_item" drop constraint if exists "purchase_order_item_purchase_order_id_foreign";`);

    this.addSql(`drop index if exists "IDX_purchase_order_item_purchase_order_id";`);

    this.addSql(`alter table if exists "supplier" drop column if exists "is_pricing_source", drop column if exists "pricing_priority", drop column if exists "auto_sync_prices";`);

    this.addSql(`drop index if exists "supplier_active_price_list_brand_idx";`);
    this.addSql(`alter table if exists "supplier_price_list" drop column if exists "brand_id";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "supplier_active_price_list_idx" ON "supplier_price_list" (supplier_id, is_active) WHERE is_active = true AND deleted_at IS NULL;`);

    this.addSql(`alter table if exists "supplier_price_list_item" drop column if exists "discount_code", drop column if exists "description", drop column if exists "category", drop column if exists "last_synced_at", drop column if exists "sync_status", drop column if exists "sync_error";`);

    this.addSql(`alter table if exists "supplier_price_list_item" add column if not exists "discount_amount" numeric null, add column if not exists "raw_discount_amount" jsonb null;`);
  }

}
