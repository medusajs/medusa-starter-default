import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250717071558 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_machine_model";`);

    this.addSql(`alter table if exists "machine" add column if not exists "brand_id" text null, add column if not exists "license_plate" text null, add column if not exists "description" text null;`);
    this.addSql(`alter table if exists "machine" rename column "model" to "model_number";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_brand_id" ON "machine" (brand_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_model_number" ON "machine" (model_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_year" ON "machine" (year) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_machine_brand_id";`);
    this.addSql(`drop index if exists "IDX_machine_model_number";`);
    this.addSql(`drop index if exists "IDX_machine_year";`);
    this.addSql(`alter table if exists "machine" drop column if exists "brand_id", drop column if exists "license_plate", drop column if exists "description";`);

    this.addSql(`alter table if exists "machine" rename column "model_number" to "model";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_model" ON "machine" (model) WHERE deleted_at IS NULL;`);
  }

}
