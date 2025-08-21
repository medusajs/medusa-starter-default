import { Migration } from '@mikro-orm/migrations';

export class Migration20250820140742 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order_time_entry" add column if not exists "is_active" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_order_time_entry" drop column if exists "is_active";`);
  }

}
