import { Migration } from '@mikro-orm/migrations';

/**
 * Adds pricing sync configuration fields to supplier model
 */
export class Migration20251017000001 extends Migration {
  override async up(): Promise<void> {
    // Add pricing sync configuration fields
    this.addSql(`
      alter table "supplier"
      add column if not exists "is_pricing_source" boolean not null default false,
      add column if not exists "pricing_priority" integer not null default 0,
      add column if not exists "auto_sync_prices" boolean not null default false;
    `);

    // Add index for querying pricing source suppliers
    this.addSql(`
      create index if not exists "supplier_pricing_source_idx"
      on "supplier" ("is_pricing_source", "pricing_priority")
      where "is_pricing_source" = true;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "supplier_pricing_source_idx";`);
    this.addSql(`
      alter table "supplier"
      drop column if exists "is_pricing_source",
      drop column if exists "pricing_priority",
      drop column if exists "auto_sync_prices";
    `);
  }
}
