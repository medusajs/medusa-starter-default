import { Migration } from '@mikro-orm/migrations';

export class Migration20250714105721 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_invoice_number_unique";`);
    this.addSql(`create table if not exists "invoice" ("id" text not null, "invoice_number" text not null, "customer_id" text not null, "order_id" text null, "service_order_id" text null, "invoice_type" text check ("invoice_type" in ('product_sale', 'service_work', 'mixed')) not null default 'product_sale', "status" text check ("status" in ('draft', 'sent', 'paid', 'overdue', 'cancelled')) not null default 'draft', "invoice_date" timestamptz not null, "due_date" timestamptz not null, "sent_date" timestamptz null, "paid_date" timestamptz null, "subtotal" numeric not null default 0, "tax_amount" numeric not null default 0, "discount_amount" numeric not null default 0, "total_amount" numeric not null default 0, "currency_code" text not null default 'EUR', "billing_address" jsonb not null, "shipping_address" jsonb null, "customer_email" text not null, "customer_phone" text null, "notes" text null, "internal_notes" text null, "payment_terms" text null, "pdf_file_id" text null, "created_by" text null, "metadata" jsonb null, "raw_subtotal" jsonb not null, "raw_tax_amount" jsonb not null, "raw_discount_amount" jsonb not null, "raw_total_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_invoice_number_unique" ON "invoice" (invoice_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "invoice_line_item" ("id" text not null, "invoice_id" text not null, "item_type" text check ("item_type" in ('product', 'service', 'labor', 'shipping', 'discount')) not null default 'product', "product_id" text null, "variant_id" text null, "service_order_item_id" text null, "service_order_time_entry_id" text null, "title" text not null, "description" text null, "sku" text null, "quantity" numeric not null, "unit_price" numeric not null, "total_price" numeric not null, "discount_amount" numeric not null default 0, "tax_rate" numeric not null default 0, "tax_amount" numeric not null default 0, "hours_worked" numeric null, "hourly_rate" numeric null, "notes" text null, "metadata" jsonb null, "raw_quantity" jsonb not null, "raw_unit_price" jsonb not null, "raw_total_price" jsonb not null, "raw_discount_amount" jsonb not null, "raw_tax_rate" jsonb not null, "raw_tax_amount" jsonb not null, "raw_hours_worked" jsonb null, "raw_hourly_rate" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_line_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_line_item_deleted_at" ON "invoice_line_item" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "invoice_status_history" ("id" text not null, "invoice_id" text not null, "from_status" text null, "to_status" text not null, "changed_by" text not null, "changed_at" timestamptz not null, "reason" text null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_status_history_deleted_at" ON "invoice_status_history" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice" cascade;`);

    this.addSql(`drop table if exists "invoice_line_item" cascade;`);

    this.addSql(`drop table if exists "invoice_status_history" cascade;`);
  }

}
