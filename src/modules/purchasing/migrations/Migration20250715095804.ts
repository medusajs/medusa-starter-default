import { Migration } from '@mikro-orm/migrations';

export class Migration20250715095804 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "supplier" drop constraint if exists "supplier_code_unique";`);
    this.addSql(`alter table if exists "purchase_order" drop constraint if exists "purchase_order_po_number_unique";`);
    this.addSql(`alter table if exists "purchase_order" add column if not exists "po_number" text not null, add column if not exists "priority" text check ("priority" in ('low', 'normal', 'high', 'urgent')) not null default 'normal', add column if not exists "order_date" timestamptz not null, add column if not exists "expected_delivery_date" timestamptz null, add column if not exists "actual_delivery_date" timestamptz null, add column if not exists "currency_code" text not null default 'USD', add column if not exists "subtotal" numeric not null default 0, add column if not exists "tax_amount" numeric not null default 0, add column if not exists "shipping_amount" numeric not null default 0, add column if not exists "discount_amount" numeric not null default 0, add column if not exists "total_amount" numeric not null default 0, add column if not exists "payment_terms" text null, add column if not exists "delivery_address" jsonb null, add column if not exists "billing_address" jsonb null, add column if not exists "notes" text null, add column if not exists "internal_notes" text null, add column if not exists "created_by" text null, add column if not exists "confirmed_by" text null, add column if not exists "approved_by" text null, add column if not exists "metadata" jsonb null, add column if not exists "raw_subtotal" jsonb not null, add column if not exists "raw_tax_amount" jsonb not null, add column if not exists "raw_shipping_amount" jsonb not null, add column if not exists "raw_discount_amount" jsonb not null, add column if not exists "raw_total_amount" jsonb not null;`);
    this.addSql(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                     WHERE constraint_name = 'purchase_order_status_check' 
                     AND table_name = 'purchase_order') THEN
        ALTER TABLE purchase_order ADD CONSTRAINT purchase_order_status_check 
        CHECK(status IN ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'));
      END IF;
    END $$;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_purchase_order_po_number_unique" ON "purchase_order" (po_number) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "purchase_order_item" add column if not exists "supplier_product_id" text null, add column if not exists "supplier_sku" text null, add column if not exists "product_title" text not null, add column if not exists "product_variant_title" text null, add column if not exists "product_sku" text null, add column if not exists "quantity_received" integer not null default 0, add column if not exists "line_total" numeric not null, add column if not exists "received_date" timestamptz null, add column if not exists "expected_receipt_date" timestamptz null, add column if not exists "notes" text null, add column if not exists "metadata" jsonb null, add column if not exists "raw_line_total" jsonb not null;`);
    this.addSql(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_order_item' AND column_name = 'quantity') THEN
        ALTER TABLE purchase_order_item RENAME COLUMN quantity TO quantity_ordered;
      END IF;
    END $$;`);
    this.addSql(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_order_item' AND column_name = 'unit_price') THEN
        ALTER TABLE purchase_order_item RENAME COLUMN unit_price TO unit_cost;
      END IF;
    END $$;`);
    this.addSql(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'purchase_order_item' AND column_name = 'raw_unit_price') THEN
        ALTER TABLE purchase_order_item RENAME COLUMN raw_unit_price TO raw_unit_cost;
      END IF;
    END $$;`);

    this.addSql(`alter table if exists "supplier" add column if not exists "code" text null, add column if not exists "phone" text null, add column if not exists "website" text null, add column if not exists "contact_person" text null, add column if not exists "address_line_1" text null, add column if not exists "address_line_2" text null, add column if not exists "city" text null, add column if not exists "state" text null, add column if not exists "postal_code" text null, add column if not exists "country" text null, add column if not exists "tax_id" text null, add column if not exists "payment_terms" text null, add column if not exists "currency_code" text not null default 'USD', add column if not exists "is_active" boolean not null default true, add column if not exists "notes" text null, add column if not exists "metadata" jsonb null;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_supplier_code_unique" ON "supplier" (code) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "supplier_product" add column if not exists "supplier_product_name" text null, add column if not exists "supplier_product_description" text null, add column if not exists "currency_code" text not null default 'USD', add column if not exists "minimum_order_quantity" integer not null default 1, add column if not exists "lead_time_days" integer null, add column if not exists "is_preferred_supplier" boolean not null default false, add column if not exists "is_active" boolean not null default true, add column if not exists "last_cost_update" timestamptz null, add column if not exists "notes" text null, add column if not exists "metadata" jsonb null;`);
    this.addSql(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'supplier_product' AND column_name = 'price') THEN
        ALTER TABLE supplier_product RENAME COLUMN price TO cost_price;
      END IF;
    END $$;`);
    this.addSql(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'supplier_product' AND column_name = 'raw_price') THEN
        ALTER TABLE supplier_product RENAME COLUMN raw_price TO raw_cost_price;
      END IF;
    END $$;`);

    // Create supplier price list table
    this.addSql(`create table if not exists "supplier_price_list" ("id" text not null, "supplier_id" text not null, "name" text not null, "description" text null, "effective_date" timestamptz null, "expiry_date" timestamptz null, "is_active" boolean not null default true, "currency_code" text not null default 'USD', "upload_filename" text null, "upload_metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_price_list_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_deleted_at" ON "supplier_price_list" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_supplier_id" ON "supplier_price_list" (supplier_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_active" ON "supplier_price_list" (is_active, effective_date, expiry_date);`);

    // Create supplier price list item table
    this.addSql(`create table if not exists "supplier_price_list_item" ("id" text not null, "price_list_id" text not null, "product_variant_id" text not null, "product_id" text not null, "supplier_sku" text null, "variant_sku" text null, "cost_price" numeric not null, "raw_cost_price" jsonb not null, "quantity" integer not null default 1, "lead_time_days" integer null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_price_list_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_item_deleted_at" ON "supplier_price_list_item" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_item_price_list_id" ON "supplier_price_list_item" (price_list_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_item_product_variant_id" ON "supplier_price_list_item" (product_variant_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_price_list_item_product_id" ON "supplier_price_list_item" (product_id);`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_supplier_price_list_item_unique" ON "supplier_price_list_item" (price_list_id, product_variant_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order" drop constraint if exists "purchase_order_status_check";`);

    this.addSql(`drop index if exists "IDX_purchase_order_po_number_unique";`);
    this.addSql(`alter table if exists "purchase_order" drop column if exists "po_number", drop column if exists "priority", drop column if exists "order_date", drop column if exists "expected_delivery_date", drop column if exists "actual_delivery_date", drop column if exists "currency_code", drop column if exists "subtotal", drop column if exists "tax_amount", drop column if exists "shipping_amount", drop column if exists "discount_amount", drop column if exists "total_amount", drop column if exists "payment_terms", drop column if exists "delivery_address", drop column if exists "billing_address", drop column if exists "notes", drop column if exists "internal_notes", drop column if exists "created_by", drop column if exists "confirmed_by", drop column if exists "approved_by", drop column if exists "metadata", drop column if exists "raw_subtotal", drop column if exists "raw_tax_amount", drop column if exists "raw_shipping_amount", drop column if exists "raw_discount_amount", drop column if exists "raw_total_amount";`);

    this.addSql(`alter table if exists "purchase_order" alter column "status" type text using ("status"::text);`);

    this.addSql(`alter table if exists "purchase_order_item" drop column if exists "supplier_product_id", drop column if exists "supplier_sku", drop column if exists "product_title", drop column if exists "product_variant_title", drop column if exists "product_sku", drop column if exists "quantity_received", drop column if exists "line_total", drop column if exists "received_date", drop column if exists "expected_receipt_date", drop column if exists "notes", drop column if exists "metadata", drop column if exists "raw_line_total";`);

    this.addSql(`alter table if exists "purchase_order_item" rename column "quantity_ordered" to "quantity";`);
    this.addSql(`alter table if exists "purchase_order_item" rename column "unit_cost" to "unit_price";`);
    this.addSql(`alter table if exists "purchase_order_item" rename column "raw_unit_cost" to "raw_unit_price";`);

    this.addSql(`drop index if exists "IDX_supplier_code_unique";`);
    this.addSql(`alter table if exists "supplier" drop column if exists "code", drop column if exists "phone", drop column if exists "website", drop column if exists "contact_person", drop column if exists "address_line_1", drop column if exists "address_line_2", drop column if exists "city", drop column if exists "state", drop column if exists "postal_code", drop column if exists "country", drop column if exists "tax_id", drop column if exists "payment_terms", drop column if exists "currency_code", drop column if exists "is_active", drop column if exists "notes", drop column if exists "metadata";`);

    this.addSql(`alter table if exists "supplier_product" drop column if exists "supplier_product_name", drop column if exists "supplier_product_description", drop column if exists "currency_code", drop column if exists "minimum_order_quantity", drop column if exists "lead_time_days", drop column if exists "is_preferred_supplier", drop column if exists "is_active", drop column if exists "last_cost_update", drop column if exists "notes", drop column if exists "metadata";`);

    this.addSql(`alter table if exists "supplier_product" rename column "cost_price" to "price";`);
    this.addSql(`alter table if exists "supplier_product" rename column "raw_cost_price" to "raw_price";`);

    // Drop supplier price list tables
    this.addSql(`drop table if exists "supplier_price_list_item" cascade;`);
    this.addSql(`drop table if exists "supplier_price_list" cascade;`);
  }

}
