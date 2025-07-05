import { Migration } from '@mikro-orm/migrations';

export class Migration20250125000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "technician" drop constraint if exists "technician_email_unique";`);
    this.addSql(`alter table if exists "technician" drop constraint if exists "technician_employee_id_unique";`);
    this.addSql(`create table if not exists "technician" ("id" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text null, "employee_id" text null, "department" text null, "position" text null, "hire_date" text null, "certification_level" text null, "certifications" text null, "specializations" text null, "hourly_rate" text null, "salary" text null, "address" text null, "emergency_contact_name" text null, "emergency_contact_phone" text null, "status" text not null default 'active', "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "technician_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_technician_email_unique" ON "technician" (email) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_technician_employee_id_unique" ON "technician" (employee_id) WHERE deleted_at IS NULL AND employee_id IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_technician_deleted_at" ON "technician" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_technician_status" ON "technician" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_technician_department" ON "technician" (department) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "technician" cascade;`);
  }

} 