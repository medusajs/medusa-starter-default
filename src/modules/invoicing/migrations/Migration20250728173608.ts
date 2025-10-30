import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250728173608 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice_line_item" add constraint "invoice_line_item_invoice_id_foreign" foreign key ("invoice_id") references "invoice" ("id") on update cascade;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_line_item_invoice_id" ON "invoice_line_item" (invoice_id) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "invoice_status_history" add constraint "invoice_status_history_invoice_id_foreign" foreign key ("invoice_id") references "invoice" ("id") on update cascade;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_status_history_invoice_id" ON "invoice_status_history" (invoice_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "invoice_line_item" drop constraint if exists "invoice_line_item_invoice_id_foreign";`);

    this.addSql(`alter table if exists "invoice_status_history" drop constraint if exists "invoice_status_history_invoice_id_foreign";`);

    this.addSql(`drop index if exists "IDX_invoice_line_item_invoice_id";`);

    this.addSql(`drop index if exists "IDX_invoice_status_history_invoice_id";`);
  }

}
