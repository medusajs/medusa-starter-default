import { Migration } from '@medusajs/framework/mikro-orm/migrations';

/**
 * TEM-170: Update SupplierPriceListItem model to support flexible discount structures
 *
 * Changes:
 * - Add discount_code field (original supplier discount code e.g., 'A', 'B')
 * - Add description field (product description from supplier)
 * - Add category field (supplier's product category)
 * - Remove discount_amount field (redundant - can be calculated)
 */
export class Migration20251018000000 extends Migration {
  override async up(): Promise<void> {
    // Add new fields for flexible discount structures and product information
    this.addSql(`
      alter table "supplier_price_list_item"
      add column if not exists "discount_code" text,
      add column if not exists "description" text,
      add column if not exists "category" text;
    `);

    // Drop redundant discount_amount field (can be calculated from gross_price and discount_percentage)
    this.addSql(`
      alter table "supplier_price_list_item"
      drop column if exists "discount_amount";
    `);
  }

  override async down(): Promise<void> {
    // Rollback: remove new fields
    this.addSql(`
      alter table "supplier_price_list_item"
      drop column if exists "discount_code",
      drop column if exists "description",
      drop column if exists "category";
    `);

    // Restore discount_amount field
    this.addSql(`
      alter table "supplier_price_list_item"
      add column if exists "discount_amount" numeric;
    `);
  }
}
