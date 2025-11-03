import { Migration } from '@mikro-orm/migrations';

export class Migration20251103203314 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "rental_order" drop constraint if exists "rental_order_rental_order_number_unique";`);
    this.addSql(`alter table if exists "rental" drop constraint if exists "rental_rental_number_unique";`);
    this.addSql(`create table if not exists "rental" ("id" text not null, "rental_number" text not null, "customer_id" text null, "machine_id" text null, "status" text check ("status" in ('draft', 'active', 'completed', 'cancelled')) not null default 'draft', "rental_type" text check ("rental_type" in ('hourly', 'daily', 'weekly', 'monthly')) not null default 'hourly', "start_machine_hours" integer null, "end_machine_hours" integer null, "total_hours_used" integer not null default 0, "hourly_rate" integer not null, "daily_rate" integer null, "total_rental_cost" integer not null default 0, "rental_start_date" timestamptz not null, "rental_end_date" timestamptz null, "expected_return_date" timestamptz not null, "actual_return_date" timestamptz null, "description" text null, "pickup_notes" text null, "return_notes" text null, "internal_notes" text null, "deposit_amount" integer null, "deposit_paid" boolean not null default false, "created_by" text null, "updated_by" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rental_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_rental_rental_number_unique" ON "rental" (rental_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_deleted_at" ON "rental" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_customer_id" ON "rental" (customer_id) WHERE customer_id IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_machine_id" ON "rental" (machine_id) WHERE machine_id IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_status" ON "rental" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_rental_start_date" ON "rental" (rental_start_date) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "rental_item" ("id" text not null, "rental_order_id" text not null, "machine_id" text null, "product_variant_id" text null, "item_type" text check ("item_type" in ('machine', 'accessory', 'tool', 'other')) not null default 'machine', "item_name" text not null, "item_description" text null, "quantity" integer not null default 1, "daily_rate" integer not null, "weekly_rate" integer null, "monthly_rate" integer null, "total_days" integer not null default 0, "line_total" integer not null default 0, "condition_on_delivery" text null, "condition_on_return" text null, "damage_assessment" text null, "damage_cost" integer not null default 0, "serial_numbers" text null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rental_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_item_deleted_at" ON "rental_item" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_item_rental_order_id" ON "rental_item" (rental_order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_item_machine_id" ON "rental_item" (machine_id) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "rental_order" ("id" text not null, "rental_order_number" text not null, "customer_id" text not null, "machine_id" text not null, "rental_type" text check ("rental_type" in ('short_term', 'long_term', 'trial')) not null default 'short_term', "status" text check ("status" in ('draft', 'confirmed', 'active', 'returned', 'overdue', 'cancelled')) not null default 'draft', "start_date" timestamptz not null, "end_date" timestamptz not null, "actual_return_date" timestamptz null, "daily_rate" integer not null, "weekly_rate" integer null, "monthly_rate" integer null, "security_deposit" integer not null default 0, "total_rental_cost" integer not null default 0, "additional_charges" integer not null default 0, "delivery_required" boolean not null default false, "delivery_address_line_1" text null, "delivery_address_line_2" text null, "delivery_city" text null, "delivery_postal_code" text null, "delivery_country" text null, "delivery_cost" integer not null default 0, "pickup_required" boolean not null default false, "pickup_address_line_1" text null, "pickup_address_line_2" text null, "pickup_city" text null, "pickup_postal_code" text null, "pickup_country" text null, "pickup_cost" integer not null default 0, "condition_on_delivery" text null, "condition_on_return" text null, "damage_notes" text null, "terms_and_conditions" text null, "special_instructions" text null, "insurance_required" boolean not null default false, "insurance_cost" integer not null default 0, "billing_cycle" text check ("billing_cycle" in ('daily', 'weekly', 'monthly')) not null default 'daily', "payment_terms" text null, "late_fee_percentage" integer not null default 0, "notes" text null, "internal_notes" text null, "created_by" text null, "updated_by" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rental_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_rental_order_rental_order_number_unique" ON "rental_order" (rental_order_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_order_deleted_at" ON "rental_order" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_order_customer_id" ON "rental_order" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_order_machine_id" ON "rental_order" (machine_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_order_status" ON "rental_order" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_order_dates" ON "rental_order" (start_date, end_date) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "rental_status_history" ("id" text not null, "rental_id" text not null, "from_status" text null, "to_status" text not null, "changed_by" text not null, "changed_at" timestamptz not null, "reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rental_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_status_history_deleted_at" ON "rental_status_history" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_status_history_rental_id" ON "rental_status_history" (rental_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_status_history_changed_at" ON "rental_status_history" (changed_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rental" cascade;`);

    this.addSql(`drop table if exists "rental_item" cascade;`);

    this.addSql(`drop table if exists "rental_order" cascade;`);

    this.addSql(`drop table if exists "rental_status_history" cascade;`);
  }

}
