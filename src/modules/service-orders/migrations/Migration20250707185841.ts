import { Migration } from '@mikro-orm/migrations';

export class Migration20250707185841 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_service_order_number_unique";`);
    this.addSql(`create table if not exists "service_order" ("id" text not null, "service_order_number" text not null, "service_type" text check ("service_type" in ('normal', 'warranty', 'setup', 'emergency', 'preventive')) not null default 'normal', "status" text check ("status" in ('draft', 'scheduled', 'in_progress', 'waiting_parts', 'customer_approval', 'completed', 'cancelled')) not null default 'draft', "priority" text check ("priority" in ('low', 'normal', 'high', 'urgent')) not null default 'normal', "description" text not null, "customer_complaint" text null, "diagnosis" text null, "work_performed" text null, "scheduled_start_date" timestamptz null, "scheduled_end_date" timestamptz null, "actual_start_date" timestamptz null, "actual_end_date" timestamptz null, "estimated_hours" integer null, "actual_hours" integer not null default 0, "labor_rate" integer null, "total_labor_cost" integer not null default 0, "total_parts_cost" integer not null default 0, "total_cost" integer not null default 0, "warranty_claim_number" text null, "warranty_approved" boolean not null default false, "requires_parts_approval" boolean not null default false, "customer_approval_required" boolean not null default false, "internal_notes" text null, "customer_notes" text null, "created_by" text null, "updated_by" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_service_order_service_order_number_unique" ON "service_order" (service_order_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_order_deleted_at" ON "service_order" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_order_item" ("id" text not null, "service_order_id" text not null, "product_id" text null, "variant_id" text null, "title" text not null, "description" text null, "sku" text null, "quantity_needed" integer not null, "quantity_used" integer not null default 0, "quantity_returned" integer not null default 0, "unit_price" integer not null, "total_price" integer not null, "status" text check ("status" in ('pending', 'ordered', 'received', 'used', 'returned')) not null default 'pending', "is_warranty_covered" boolean not null default false, "supplier_order_number" text null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_order_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_order_item_deleted_at" ON "service_order_item" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_order_status_history" ("id" text not null, "service_order_id" text not null, "from_status" text null, "to_status" text not null, "changed_by" text not null, "changed_at" timestamptz not null, "reason" text null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_order_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_order_status_history_deleted_at" ON "service_order_status_history" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_order_time_entry" ("id" text not null, "service_order_id" text not null, "technician_id" text null, "start_time" timestamptz not null, "end_time" timestamptz null, "duration_minutes" integer not null default 0, "work_description" text not null, "work_category" text check ("work_category" in ('diagnosis', 'repair', 'testing', 'documentation', 'travel')) not null default 'repair', "billable_hours" integer not null default 0, "hourly_rate" integer not null, "total_cost" integer not null default 0, "is_billable" boolean not null default true, "is_approved" boolean not null default false, "approved_by" text null, "approved_at" timestamptz null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_order_time_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_order_time_entry_deleted_at" ON "service_order_time_entry" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "service_order" cascade;`);

    this.addSql(`drop table if exists "service_order_item" cascade;`);

    this.addSql(`drop table if exists "service_order_status_history" cascade;`);

    this.addSql(`drop table if exists "service_order_time_entry" cascade;`);
  }

}
