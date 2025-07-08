import { Migration } from '@mikro-orm/migrations';

export class Migration20250708170210 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "machine" drop column if exists "brand";`);

    this.addSql(`alter table if exists "machine" add column if not exists "raw_purchase_price" jsonb null, add column if not exists "raw_current_value" jsonb null;`);
    this.addSql(`alter table if exists "machine" alter column "year" type integer using ("year"::integer);`);
    this.addSql(`alter table if exists "machine" alter column "year" drop not null;`);
    this.addSql(`alter table if exists "machine" alter column "engine_hours" type integer using ("engine_hours"::integer);`);
    this.addSql(`alter table if exists "machine" alter column "fuel_type" type text using ("fuel_type"::text);`);
    this.addSql(`alter table if exists "machine" alter column "fuel_type" drop not null;`);
    this.addSql(`alter table if exists "machine" alter column "horsepower" type integer using ("horsepower"::integer);`);
    this.addSql(`alter table if exists "machine" alter column "weight" type integer using ("weight"::integer);`);
    this.addSql(`alter table if exists "machine" alter column "purchase_date" type timestamptz using ("purchase_date"::timestamptz);`);
    this.addSql(`alter table if exists "machine" alter column "purchase_price" type numeric using ("purchase_price"::numeric);`);
    this.addSql(`alter table if exists "machine" alter column "current_value" type numeric using ("current_value"::numeric);`);
    this.addSql(`alter table if exists "machine" add constraint "machine_status_check" check("status" in ('active', 'inactive', 'maintenance', 'sold'));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_customer_id" ON "machine" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_status" ON "machine" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_model" ON "machine" (model) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "machine" drop constraint if exists "machine_status_check";`);

    this.addSql(`drop index if exists "IDX_machine_customer_id";`);
    this.addSql(`drop index if exists "IDX_machine_status";`);
    this.addSql(`drop index if exists "IDX_machine_model";`);
    this.addSql(`alter table if exists "machine" drop column if exists "raw_purchase_price", drop column if exists "raw_current_value";`);

    this.addSql(`alter table if exists "machine" add column if not exists "brand" text not null;`);
    this.addSql(`alter table if exists "machine" alter column "year" type text using ("year"::text);`);
    this.addSql(`alter table if exists "machine" alter column "year" set not null;`);
    this.addSql(`alter table if exists "machine" alter column "engine_hours" type text using ("engine_hours"::text);`);
    this.addSql(`alter table if exists "machine" alter column "fuel_type" type text using ("fuel_type"::text);`);
    this.addSql(`alter table if exists "machine" alter column "fuel_type" set not null;`);
    this.addSql(`alter table if exists "machine" alter column "horsepower" type text using ("horsepower"::text);`);
    this.addSql(`alter table if exists "machine" alter column "weight" type text using ("weight"::text);`);
    this.addSql(`alter table if exists "machine" alter column "purchase_date" type text using ("purchase_date"::text);`);
    this.addSql(`alter table if exists "machine" alter column "purchase_price" type text using ("purchase_price"::text);`);
    this.addSql(`alter table if exists "machine" alter column "current_value" type text using ("current_value"::text);`);
    this.addSql(`alter table if exists "machine" alter column "status" type text using ("status"::text);`);
  }

}
