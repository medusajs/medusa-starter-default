import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250728194731 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "warranty" drop constraint if exists "warranty_warranty_number_unique";`);
    this.addSql(`create table if not exists "warranty" ("id" text not null, "warranty_number" text not null, "service_order_id" text not null, "customer_id" text null, "machine_id" text null, "warranty_type" text check ("warranty_type" in ('manufacturer', 'supplier', 'extended', 'goodwill')) not null default 'manufacturer', "status" text check ("status" in ('draft', 'submitted', 'approved', 'reimbursed', 'rejected', 'closed')) not null default 'draft', "warranty_claim_number" text null, "warranty_provider" text null, "claim_reference" text null, "labor_cost" integer not null default 0, "parts_cost" integer not null default 0, "total_cost" integer not null default 0, "reimbursement_amount" integer not null default 0, "currency_code" text not null default 'EUR', "warranty_start_date" timestamptz null, "warranty_end_date" timestamptz null, "claim_date" timestamptz null, "approval_date" timestamptz null, "reimbursement_date" timestamptz null, "billing_address_line_1" text null, "billing_address_line_2" text null, "billing_city" text null, "billing_postal_code" text null, "billing_country" text not null default 'BE', "service_address_line_1" text null, "service_address_line_2" text null, "service_city" text null, "service_postal_code" text null, "service_country" text not null default 'BE', "description" text null, "failure_description" text null, "repair_description" text null, "notes" text null, "internal_notes" text null, "metadata" jsonb null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "warranty_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_warranty_warranty_number_unique" ON "warranty" (warranty_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_deleted_at" ON "warranty" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_warranty_warranty_number" ON "warranty" (warranty_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_service_order_id" ON "warranty" (service_order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_customer_id" ON "warranty" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_machine_id" ON "warranty" (machine_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_status" ON "warranty" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_warranty_type" ON "warranty" (warranty_type) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_claim_date" ON "warranty" (claim_date) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "warranty_line_item" ("id" text not null, "item_type" text check ("item_type" in ('labor', 'product', 'shipping', 'adjustment')) not null default 'labor', "title" text not null, "description" text null, "sku" text null, "quantity" integer not null default 1, "unit_price" integer not null default 0, "total_amount" integer not null default 0, "product_id" text null, "variant_id" text null, "service_order_id" text null, "service_order_item_id" text null, "service_order_time_entry_id" text null, "hours_worked" integer null, "hourly_rate" integer null, "tax_rate" integer not null default 0.21, "tax_amount" integer not null default 0, "is_reimbursable" boolean not null default true, "reimbursement_amount" integer not null default 0, "reimbursement_reference" text null, "metadata" jsonb null, "warranty_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "warranty_line_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_line_item_warranty_id" ON "warranty_line_item" (warranty_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_line_item_deleted_at" ON "warranty_line_item" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_line_item_product_id" ON "warranty_line_item" (product_id) WHERE product_id IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_line_item_variant_id" ON "warranty_line_item" (variant_id) WHERE variant_id IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_line_item_service_order_id" ON "warranty_line_item" (service_order_id) WHERE service_order_id IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_line_item_type" ON "warranty_line_item" (item_type) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "warranty_status_history" ("id" text not null, "from_status" text check ("from_status" in ('draft', 'submitted', 'approved', 'reimbursed', 'rejected', 'closed')) null, "to_status" text check ("to_status" in ('draft', 'submitted', 'approved', 'reimbursed', 'rejected', 'closed')) not null, "changed_by" text null, "change_reason" text null, "notes" text null, "external_reference" text null, "approval_number" text null, "metadata" jsonb null, "warranty_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "warranty_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_status_history_warranty_id" ON "warranty_status_history" (warranty_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_status_history_deleted_at" ON "warranty_status_history" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_status_history_to_status" ON "warranty_status_history" (to_status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_warranty_status_history_created_at" ON "warranty_status_history" (created_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "warranty_line_item" add constraint "warranty_line_item_warranty_id_foreign" foreign key ("warranty_id") references "warranty" ("id") on update cascade;`);

    this.addSql(`alter table if exists "warranty_status_history" add constraint "warranty_status_history_warranty_id_foreign" foreign key ("warranty_id") references "warranty" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "warranty_line_item" drop constraint if exists "warranty_line_item_warranty_id_foreign";`);

    this.addSql(`alter table if exists "warranty_status_history" drop constraint if exists "warranty_status_history_warranty_id_foreign";`);

    this.addSql(`drop table if exists "warranty" cascade;`);

    this.addSql(`drop table if exists "warranty_line_item" cascade;`);

    this.addSql(`drop table if exists "warranty_status_history" cascade;`);
  }

}
