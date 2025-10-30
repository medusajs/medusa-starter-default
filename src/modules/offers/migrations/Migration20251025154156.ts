import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251025154156 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "offer" drop constraint if exists "offer_offer_number_unique";`);
    this.addSql(`create table if not exists "offer" ("id" text not null, "offer_number" text not null, "customer_id" text not null, "customer_email" text not null, "customer_phone" text null, "status" text check ("status" in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')) not null default 'draft', "offer_date" timestamptz not null, "valid_until" timestamptz not null, "sent_date" timestamptz null, "accepted_date" timestamptz null, "rejected_date" timestamptz null, "converted_date" timestamptz null, "subtotal" numeric not null default 0, "tax_amount" numeric not null default 0, "discount_amount" numeric not null default 0, "total_amount" numeric not null default 0, "currency_code" text not null default 'EUR', "billing_address" jsonb not null, "shipping_address" jsonb null, "notes" text null, "internal_notes" text null, "terms_and_conditions" text null, "pdf_file_id" text null, "converted_order_id" text null, "created_by" text null, "metadata" jsonb null, "raw_subtotal" jsonb not null, "raw_tax_amount" jsonb not null, "raw_discount_amount" jsonb not null, "raw_total_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_offer_offer_number_unique" ON "offer" (offer_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_deleted_at" ON "offer" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "offer_line_item" ("id" text not null, "item_type" text check ("item_type" in ('product', 'custom', 'discount')) not null default 'product', "product_id" text null, "variant_id" text null, "title" text not null, "description" text null, "sku" text null, "quantity" numeric not null, "unit_price" numeric not null, "total_price" numeric not null, "discount_amount" numeric not null default 0, "tax_rate" numeric not null default 0, "tax_amount" numeric not null default 0, "notes" text null, "metadata" jsonb null, "offer_id" text not null, "raw_quantity" jsonb not null, "raw_unit_price" jsonb not null, "raw_total_price" jsonb not null, "raw_discount_amount" jsonb not null, "raw_tax_rate" jsonb not null, "raw_tax_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_line_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_line_item_offer_id" ON "offer_line_item" (offer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_line_item_deleted_at" ON "offer_line_item" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "offer_status_history" ("id" text not null, "from_status" text null, "to_status" text not null, "changed_by" text not null, "changed_at" timestamptz not null, "reason" text null, "offer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_status_history_offer_id" ON "offer_status_history" (offer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_status_history_deleted_at" ON "offer_status_history" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "offer_line_item" add constraint "offer_line_item_offer_id_foreign" foreign key ("offer_id") references "offer" ("id") on update cascade;`);

    this.addSql(`alter table if exists "offer_status_history" add constraint "offer_status_history_offer_id_foreign" foreign key ("offer_id") references "offer" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "offer_line_item" drop constraint if exists "offer_line_item_offer_id_foreign";`);

    this.addSql(`alter table if exists "offer_status_history" drop constraint if exists "offer_status_history_offer_id_foreign";`);

    this.addSql(`drop table if exists "offer" cascade;`);

    this.addSql(`drop table if exists "offer_line_item" cascade;`);

    this.addSql(`drop table if exists "offer_status_history" cascade;`);
  }

}
