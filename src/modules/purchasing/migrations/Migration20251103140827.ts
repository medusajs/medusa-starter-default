import { Migration } from '@mikro-orm/migrations';

export class Migration20251103140827 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "purchase_order_delivery" ("id" text not null, "purchase_order_id" text not null, "delivery_number" text null, "delivery_date" timestamptz not null, "received_by" text null, "notes" text null, "import_filename" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_delivery_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_delivery_deleted_at" ON "purchase_order_delivery" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "purchase_order_delivery_item" ("id" text not null, "delivery_id" text not null, "purchase_order_item_id" text not null, "quantity_delivered" integer not null, "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_delivery_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_delivery_item_delivery_id" ON "purchase_order_delivery_item" (delivery_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_delivery_item_deleted_at" ON "purchase_order_delivery_item" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "purchase_order_delivery_item" add constraint "purchase_order_delivery_item_delivery_id_foreign" foreign key ("delivery_id") references "purchase_order_delivery" ("id") on update cascade;`);

    this.addSql(`alter table if exists "purchase_order" add column if not exists "type" text check ("type" in ('stock', 'rush')) not null default 'stock';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order_delivery_item" drop constraint if exists "purchase_order_delivery_item_delivery_id_foreign";`);

    this.addSql(`drop table if exists "purchase_order_delivery" cascade;`);

    this.addSql(`drop table if exists "purchase_order_delivery_item" cascade;`);

    this.addSql(`alter table if exists "purchase_order" drop column if exists "type";`);
  }

}
