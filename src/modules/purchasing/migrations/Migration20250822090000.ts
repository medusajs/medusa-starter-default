import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250822090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "supplier_price_list" add column if not exists "brand_id" text null;`);
    this.addSql(`drop index if exists "supplier_active_price_list_idx";`);
    this.addSql(`create unique index if not exists "supplier_active_price_list_brand_idx" on "supplier_price_list" ("supplier_id", "brand_id", "is_active") where is_active = true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "supplier_active_price_list_brand_idx";`);
    this.addSql(`create unique index if not exists "supplier_active_price_list_idx" on "supplier_price_list" ("supplier_id", "is_active") where is_active = true;`);
    this.addSql(`alter table "supplier_price_list" drop column if exists "brand_id";`);
  }
}


