import { Migration } from '@mikro-orm/migrations';

export class Migration20250717093137 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order" add column if not exists "service_location" text check ("service_location" in ('workshop', 'customer_location')) not null default 'workshop', add column if not exists "service_address_line_1" text null, add column if not exists "service_address_line_2" text null, add column if not exists "service_city" text null, add column if not exists "service_postal_code" text null, add column if not exists "service_country" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop column if exists "service_location", drop column if exists "service_address_line_1", drop column if exists "service_address_line_2", drop column if exists "service_city", drop column if exists "service_postal_code", drop column if exists "service_country";`);
  }

}
