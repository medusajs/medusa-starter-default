import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250711064641 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "purchase_order" ("id" text not null, "supplier_id" text not null, "status" text not null default 'draft', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_deleted_at" ON "purchase_order" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "purchase_order_item" ("id" text not null, "purchase_order_id" text not null, "product_variant_id" text not null, "quantity" integer not null, "unit_price" numeric not null, "raw_unit_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_item_deleted_at" ON "purchase_order_item" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "supplier" ("id" text not null, "name" text not null, "email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at" ON "supplier" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "supplier_product" ("id" text not null, "supplier_id" text not null, "product_variant_id" text not null, "supplier_sku" text null, "price" numeric not null, "raw_price" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_product_deleted_at" ON "supplier_product" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "purchase_order" cascade;`);

    this.addSql(`drop table if exists "purchase_order_item" cascade;`);

    this.addSql(`drop table if exists "supplier" cascade;`);

    this.addSql(`drop table if exists "supplier_product" cascade;`);
  }

}
