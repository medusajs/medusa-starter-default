import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251030000000 extends Migration {

  async up(): Promise<void> {
    // Rename table from user_preferences to user_preference (singular)
    this.addSql('ALTER TABLE IF EXISTS "user_preferences" RENAME TO "user_preference";');
  }

  async down(): Promise<void> {
    // Revert: rename table back to user_preferences (plural)
    this.addSql('ALTER TABLE IF EXISTS "user_preference" RENAME TO "user_preferences";');
  }

}
