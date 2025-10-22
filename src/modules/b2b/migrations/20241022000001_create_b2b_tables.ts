import { Migration } from "@mikro-orm/migrations"

export class Migration20241022000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "company" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT NULL,
        "address" TEXT NULL,
        "city" TEXT NULL,
        "state" TEXT NULL,
        "zip" TEXT NULL,
        "country" TEXT NULL,
        "currency_code" TEXT NOT NULL,
        "approval_settings" JSONB NOT NULL DEFAULT jsonb_build_object('requires_admin_approval', false),
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "company_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_company_email" ON "company" ("email")
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_company_country" ON "company" ("country")
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "employee" (
        "id" TEXT NOT NULL,
        "company_id" TEXT NOT NULL,
        "customer_id" TEXT NOT NULL,
        "spending_limit" NUMERIC NOT NULL DEFAULT 0,
        "is_admin" BOOLEAN NOT NULL DEFAULT false,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "employee_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "employee_company_fk" FOREIGN KEY ("company_id") REFERENCES "company" ("id") ON DELETE CASCADE
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_employee_company_id" ON "employee" ("company_id")
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_employee_customer_id" ON "employee" ("customer_id")
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cart_approval" (
        "id" TEXT NOT NULL,
        "cart_id" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "requested_by" TEXT NOT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "cart_approval_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cart_approval_cart_id" ON "cart_approval" ("cart_id")
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cart_approval_status" ON "cart_approval" ("status")
      WHERE deleted_at IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "cart_approval";')
    this.addSql('DROP TABLE IF EXISTS "employee";')
    this.addSql('DROP TABLE IF EXISTS "company";')
  }
}
