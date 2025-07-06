import { Migration } from '@mikro-orm/migrations';

export class Migration20250104000001 extends Migration {

  override async up(): Promise<void> {
    // Drop the brand column since it will be replaced by the Brand module link
    this.addSql(`alter table if exists "machine" drop column if exists "brand";`);
  }

  override async down(): Promise<void> {
    // Add the brand column back if rolling back
    this.addSql(`alter table if exists "machine" add column "brand" text;`);
  }

} 