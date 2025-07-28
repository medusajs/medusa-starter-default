import { Migration } from '@mikro-orm/migrations';

export class Migration20250727094542 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_status_check";`);

    this.addSql(`alter table if exists "service_order" add constraint "service_order_status_check" check("status" in ('draft', 'ready_for_pickup', 'in_progress', 'done', 'returned_for_review'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_status_check";`);

    this.addSql(`alter table if exists "service_order" add constraint "service_order_status_check" check("status" in ('draft', 'scheduled', 'in_progress', 'waiting_parts', 'customer_approval', 'completed', 'cancelled'));`);
  }

}
