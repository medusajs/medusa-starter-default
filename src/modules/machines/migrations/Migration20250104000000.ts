import { Migration } from '@mikro-orm/migrations';

export class Migration20250104000000 extends Migration {

  override async up(): Promise<void> {
    // Rename the brand column to brand_name to avoid conflict with Brand module link
    this.addSql(`alter table if exists "machine" rename column "brand" to "brand_name";`);
  }

  override async down(): Promise<void> {
    // Rollback: rename brand_name back to brand
    this.addSql(`alter table if exists "machine" rename column "brand_name" to "brand";`);
  }

} 