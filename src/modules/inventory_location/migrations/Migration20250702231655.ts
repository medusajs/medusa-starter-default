import { Migration } from '@mikro-orm/migrations';

export class Migration20250702231655 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "inventory_location" ("id" text not null, "name" text not null, "warehouse_id" text null, "description" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "inventory_location_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_location_deleted_at" ON "inventory_location" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "inventory_location_item" ("id" text not null, "inventory_item_id" text not null, "location_id" text not null, "quantity" integer not null default 0, "reserved_quantity" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "inventory_location_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_location_item_deleted_at" ON "inventory_location_item" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "inventory_location" cascade;`);

    this.addSql(`drop table if exists "inventory_location_item" cascade;`);
  }

}
