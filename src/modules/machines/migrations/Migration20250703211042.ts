import { Migration } from '@mikro-orm/migrations';

export class Migration20250703211042 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "machine" drop constraint if exists "machine_serial_number_unique";`);
    this.addSql(`create table if not exists "machine" ("id" text not null, "brand" text not null, "model" text not null, "serial_number" text not null, "year" text not null, "engine_hours" text null, "fuel_type" text not null, "horsepower" text null, "weight" text null, "purchase_date" text null, "purchase_price" text null, "current_value" text null, "status" text not null default 'active', "location" text null, "notes" text null, "customer_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "machine_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_machine_serial_number_unique" ON "machine" (serial_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_deleted_at" ON "machine" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "machine" cascade;`);
  }

}
