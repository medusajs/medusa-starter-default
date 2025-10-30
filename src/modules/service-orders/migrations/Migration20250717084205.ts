import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250717084205 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order" add column if not exists "machine_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop column if exists "machine_id";`);
  }

}
