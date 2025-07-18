import { Migration } from '@mikro-orm/migrations';

export class Migration20250718000000 extends Migration {

  override async up(): Promise<void> {
    // Add version column to supplier_price_list table if it doesn't exist
    this.addSql(`ALTER TABLE "supplier_price_list" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;`);
    
    // Update existing records to have version 1 where null
    this.addSql(`UPDATE "supplier_price_list" SET "version" = 1 WHERE "version" IS NULL;`);
  }

  override async down(): Promise<void> {
    // Remove version column
    this.addSql(`ALTER TABLE "supplier_price_list" DROP COLUMN IF EXISTS "version";`);
  }

}