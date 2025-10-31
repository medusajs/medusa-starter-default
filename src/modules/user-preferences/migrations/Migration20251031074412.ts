import { Migration } from '@mikro-orm/migrations';

export class Migration20251031074412 extends Migration {

  override async up(): Promise<void> {
    // Rename the existing table to the new name to preserve data
    this.addSql(`alter table if exists "user_preferences" rename to "custom_user_preference";`);

    // Drop old constraints and indexes
    this.addSql(`alter table if exists "custom_user_preference" drop constraint if exists "user_preferences_pkey";`);
    this.addSql(`drop index if exists "IDX_user_preferences_deleted_at";`);
    this.addSql(`drop index if exists "IDX_user_preferences_user_id_unique";`);

    // Add new constraints and indexes with the new table name
    this.addSql(`alter table if exists "custom_user_preference" add constraint "custom_user_preference_pkey" primary key ("id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_custom_user_preference_deleted_at" ON "custom_user_preference" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_custom_user_preference_user_id_unique" ON "custom_user_preference" (user_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    // Reverse the rename operation to rollback
    this.addSql(`alter table if exists "custom_user_preference" rename to "user_preferences";`);

    // Drop new constraints and indexes
    this.addSql(`alter table if exists "user_preferences" drop constraint if exists "custom_user_preference_pkey";`);
    this.addSql(`drop index if exists "IDX_custom_user_preference_deleted_at";`);
    this.addSql(`drop index if exists "IDX_custom_user_preference_user_id_unique";`);

    // Restore old constraints and indexes
    this.addSql(`alter table if exists "user_preferences" add constraint "user_preferences_pkey" primary key ("id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_preferences_deleted_at" ON "user_preferences" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_preferences_user_id_unique" ON "user_preferences" (user_id) WHERE deleted_at IS NULL;`);
  }

}
