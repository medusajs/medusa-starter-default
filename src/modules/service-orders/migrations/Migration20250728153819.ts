import { Migration } from '@mikro-orm/migrations';

export class Migration20250728153819 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_service_type_check";`);

    this.addSql(`alter table if exists "service_order" add column if not exists "has_appointment" boolean not null default false, add column if not exists "needs_replacement_vehicle" boolean not null default false, add column if not exists "includes_minor_maintenance" boolean not null default false, add column if not exists "includes_major_maintenance" boolean not null default false, add column if not exists "is_repeated_repair" boolean not null default false, add column if not exists "includes_cleaning" boolean not null default false, add column if not exists "est_used" boolean not null default false, add column if not exists "ca_used" boolean not null default false;`);
    this.addSql(`alter table if exists "service_order" add constraint "service_order_service_type_check" check("service_type" in ('insurance', 'warranty', 'internal', 'standard', 'sales_prep', 'quote'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_service_type_check";`);

    this.addSql(`alter table if exists "service_order" drop column if exists "has_appointment", drop column if exists "needs_replacement_vehicle", drop column if exists "includes_minor_maintenance", drop column if exists "includes_major_maintenance", drop column if exists "is_repeated_repair", drop column if exists "includes_cleaning", drop column if exists "est_used", drop column if exists "ca_used";`);

    this.addSql(`alter table if exists "service_order" add constraint "service_order_service_type_check" check("service_type" in ('normal', 'warranty', 'setup', 'emergency', 'preventive'));`);
  }

}
