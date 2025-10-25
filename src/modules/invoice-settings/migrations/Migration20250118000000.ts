import { Migration } from '@mikro-orm/migrations';

export class Migration20250118000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "invoice_settings" (
      "id" text not null,
      "company_name" text not null,
      "company_address_street" text not null,
      "company_address_city" text not null,
      "company_address_postal_code" text not null,
      "company_address_country" text not null,
      "company_email" text not null,
      "company_phone" text not null,
      "company_website" text null,
      "vat_number" text not null,
      "registration_number" text null,
      "bank_account" text null,
      "template_header_color" text not null default '#2c5530',
      "template_logo_url" text null,
      "template_footer_text" text null,
      "template_show_payment_terms" boolean not null default true,
      "template_show_due_date" boolean not null default true,
      "template_currency_format" text not null default 'nl-BE',
      "template_date_format" text not null default 'dd/MM/yyyy',
      "default_payment_terms" text not null,
      "default_due_days" integer not null default 30,
      "default_tax_rate" numeric not null default 0.21,
      "default_currency_code" text not null default 'EUR',
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "invoice_settings_pkey" primary key ("id")
    );`);
    
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_settings_deleted_at" ON "invoice_settings" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice_settings" cascade;`);
  }

}





