import { Migration } from '@mikro-orm/migrations';

export class Migration20251031180000 extends Migration {

  override async up(): Promise<void> {
    // Restore store_id column to core Medusa tables that require it
    // This fixes the issue where the previous migration removed store_id from ALL tables,
    // including core Medusa tables that need it for proper functionality.

    // Add store_id to store_currency table (required by Medusa Store Module)
    this.addSql(`
      ALTER TABLE store_currency
      ADD COLUMN IF NOT EXISTS store_id text NULL;
    `);

    // Add foreign key constraint
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'store_currency_store_id_foreign'
          AND table_name = 'store_currency'
        ) THEN
          ALTER TABLE store_currency
          ADD CONSTRAINT store_currency_store_id_foreign
          FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Create index for better query performance
    this.addSql(`
      CREATE INDEX IF NOT EXISTS store_currency_store_id_index
      ON store_currency(store_id);
    `);

    // Populate store_id for existing store_currency records
    // Set them to the first (default) store
    this.addSql(`
      UPDATE store_currency
      SET store_id = (SELECT id FROM store ORDER BY created_at ASC LIMIT 1)
      WHERE store_id IS NULL;
    `);

    // Make store_id NOT NULL after populating data
    this.addSql(`
      ALTER TABLE store_currency
      ALTER COLUMN store_id SET NOT NULL;
    `);
  }

  override async down(): Promise<void> {
    // Remove the store_id column and its constraints
    this.addSql(`
      ALTER TABLE store_currency
      DROP CONSTRAINT IF EXISTS store_currency_store_id_foreign CASCADE;
    `);

    this.addSql(`
      DROP INDEX IF EXISTS store_currency_store_id_index;
    `);

    this.addSql(`
      ALTER TABLE store_currency
      DROP COLUMN IF EXISTS store_id CASCADE;
    `);
  }

}
