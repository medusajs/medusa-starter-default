import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250820155017 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "supplier_price_list_item" add column if not exists "gross_price" numeric null, add column if not exists "discount_amount" numeric null, add column if not exists "discount_percentage" numeric null, add column if not exists "raw_gross_price" jsonb null, add column if not exists "raw_discount_amount" jsonb null;`);

    // Guarded rename: only rename if the source column exists
    this.addSql(`
      do $$ begin
        if exists (
          select 1 from information_schema.columns 
          where table_name = 'supplier_price_list_item' and column_name = 'cost_price'
        ) then
          alter table "supplier_price_list_item" rename column "cost_price" to "net_price";
        end if;
      end $$;
    `);

    this.addSql(`
      do $$ begin
        if exists (
          select 1 from information_schema.columns 
          where table_name = 'supplier_price_list_item' and column_name = 'raw_cost_price'
        ) then
          alter table "supplier_price_list_item" rename column "raw_cost_price" to "raw_net_price";
        end if;
      end $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "supplier_price_list_item" drop column if exists "gross_price", drop column if exists "discount_amount", drop column if exists "discount_percentage", drop column if exists "raw_gross_price", drop column if exists "raw_discount_amount";`);

    this.addSql(`
      do $$ begin
        if exists (
          select 1 from information_schema.columns 
          where table_name = 'supplier_price_list_item' and column_name = 'net_price'
        ) then
          alter table "supplier_price_list_item" rename column "net_price" to "cost_price";
        end if;
      end $$;
    `);
    this.addSql(`
      do $$ begin
        if exists (
          select 1 from information_schema.columns 
          where table_name = 'supplier_price_list_item' and column_name = 'raw_net_price'
        ) then
          alter table "supplier_price_list_item" rename column "raw_net_price" to "raw_cost_price";
        end if;
      end $$;
    `);
  }

}
