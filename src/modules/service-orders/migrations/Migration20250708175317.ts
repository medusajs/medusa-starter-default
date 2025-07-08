import { Migration } from '@mikro-orm/migrations';

export class Migration20250708175317 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order" add column if not exists "customer_id" text null, add column if not exists "technician_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop column if exists "customer_id", drop column if exists "technician_id";`);
  }

}
