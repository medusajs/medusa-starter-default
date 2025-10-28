import { Migration } from "@mikro-orm/migrations"

/**
 * Migration: Add Import Templates Table
 *
 * Creates supplier_import_template table to store reusable parsing configurations
 *
 * @see TEM-301 - Create Import Template Storage API
 */
export class Migration20251027210544 extends Migration {
  async up(): Promise<void> {
    // Create supplier_import_template table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "supplier_import_template" (
        "id" text PRIMARY KEY,
        "supplier_id" text NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "file_type" text NOT NULL CHECK (file_type IN ('csv', 'txt')),
        "parse_config" jsonb NOT NULL,
        "column_mapping" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,

        -- Foreign key to supplier table
        CONSTRAINT "fk_supplier_import_template_supplier"
          FOREIGN KEY ("supplier_id")
          REFERENCES "supplier" ("id")
          ON DELETE CASCADE
      );
    `)

    // Create deleted_at index for soft deletes
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_supplier_import_template_deleted_at"
        ON "supplier_import_template" ("deleted_at")
        WHERE deleted_at IS NULL;
    `)

    // Create index on supplier_id and file_type for faster filtering
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_supplier_import_template_supplier_file_type"
        ON "supplier_import_template" ("supplier_id", "file_type");
    `)

    // Create unique constraint on supplier_id + name
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_supplier_import_template_supplier_name"
        ON "supplier_import_template" ("supplier_id", "name");
    `)
  }

  async down(): Promise<void> {
    // Drop indexes first
    this.addSql('DROP INDEX IF EXISTS "IDX_supplier_import_template_deleted_at";')
    this.addSql('DROP INDEX IF EXISTS "idx_supplier_import_template_supplier_file_type";')
    this.addSql('DROP INDEX IF EXISTS "uniq_supplier_import_template_supplier_name";')

    // Drop table
    this.addSql('DROP TABLE IF EXISTS "supplier_import_template";')
  }
}
