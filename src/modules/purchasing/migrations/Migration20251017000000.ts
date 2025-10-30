import { Migration } from '@medusajs/framework/mikro-orm/migrations';

/**
 * Adds sync tracking fields to supplier_price_list_item for variant pricing sync workflow
 */
export class Migration20251017000000 extends Migration {
  override async up(): Promise<void> {
    // Add sync status tracking fields
    this.addSql(`
      alter table "supplier_price_list_item"
      add column if not exists "last_synced_at" timestamptz null,
      add column if not exists "sync_status" text null,
      add column if not exists "sync_error" text null;
    `);

    // Add index for querying items needing sync
    this.addSql(`
      create index if not exists "supplier_price_list_item_sync_status_idx"
      on "supplier_price_list_item" ("sync_status", "last_synced_at");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "supplier_price_list_item_sync_status_idx";`);
    this.addSql(`
      alter table "supplier_price_list_item"
      drop column if exists "last_synced_at",
      drop column if exists "sync_status",
      drop column if exists "sync_error";
    `);
  }
}
