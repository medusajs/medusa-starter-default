import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250724134658 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "service_order_comment" ("id" text not null, "service_order_id" text not null, "message" text not null, "author_id" text not null, "author_type" text check ("author_type" in ('user', 'technician', 'customer', 'system')) not null default 'user', "author_name" text not null, "parent_comment_id" text null, "is_internal" boolean not null default false, "is_pinned" boolean not null default false, "attachments" jsonb null, "mentions" jsonb null, "is_edited" boolean not null default false, "edited_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_order_comment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_order_comment_deleted_at" ON "service_order_comment" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "service_order_comment" cascade;`);
  }

}
