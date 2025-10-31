import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251031163122 extends Migration {

  override async up(): Promise<void> {
    // Remove store_id column from all tables that have it
    // This uses a DO block to dynamically find and drop the column from all tables
    this.addSql(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN 
          SELECT table_schema, table_name 
          FROM information_schema.columns 
          WHERE column_name = 'store_id' 
            AND table_schema = 'public'
        LOOP
          EXECUTE format('ALTER TABLE %I.%I DROP COLUMN IF EXISTS store_id CASCADE', r.table_schema, r.table_name);
        END LOOP;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Note: We cannot automatically restore store_id columns as we don't know
    // the original column definition (type, constraints, defaults, etc.)
    // This would need to be handled manually if rollback is required
    this.addSql(`-- Rollback not supported: store_id column definitions were not preserved`);
  }

}


