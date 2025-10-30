import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250104000001 extends Migration {

  override async up(): Promise<void> {
    // Drop the brand_name index first
    this.addSql(`drop index if exists "IDX_machine_brand_name";`);
    
    // Drop the brand_name column
    this.addSql(`alter table if exists "machine" drop column if exists "brand_name";`);
  }

  override async down(): Promise<void> {
    // Add back the brand_name column
    this.addSql(`alter table if exists "machine" add column if not exists "brand_name" text null;`);
    
    // Recreate the brand_name index
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_machine_brand_name" ON "machine" (brand_name) WHERE deleted_at IS NULL;`);
  }

} 