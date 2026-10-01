import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261001061142 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "preorder" drop constraint if exists "preorder_order_id_item_id_unique";`);
    // Soft-delete duplicate (order_id, item_id) rows, keeping the oldest, so the unique index can be built
    this.addSql(`update "preorder" set "deleted_at" = now() where "deleted_at" is null and "id" in (select "id" from (select "id", row_number() over (partition by "order_id", "item_id" order by "created_at" asc, "id" asc) as "rn" from "preorder" where "deleted_at" is null) as "d" where "d"."rn" > 1);`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_preorder_order_id_item_id_unique" ON "preorder" ("order_id", "item_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_preorder_order_id_item_id_unique";`);
  }

}
