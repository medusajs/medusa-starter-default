import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250725093353 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "machine" drop column if exists "fuel_type", drop column if exists "horsepower", drop column if exists "weight", drop column if exists "purchase_date", drop column if exists "purchase_price", drop column if exists "current_value", drop column if exists "location", drop column if exists "raw_purchase_price", drop column if exists "raw_current_value";`);

    this.addSql(`alter table if exists "machine" add column if not exists "machine_type" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_machine_type" ON "machine" (machine_type) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_machine_machine_type";`);

    this.addSql(`alter table if exists "machine" add column if not exists "horsepower" integer null, add column if not exists "weight" integer null, add column if not exists "purchase_date" timestamptz null, add column if not exists "purchase_price" numeric null, add column if not exists "current_value" numeric null, add column if not exists "location" text null, add column if not exists "raw_purchase_price" jsonb null, add column if not exists "raw_current_value" jsonb null;`);
    this.addSql(`alter table if exists "machine" rename column "machine_type" to "fuel_type";`);
  }

}
