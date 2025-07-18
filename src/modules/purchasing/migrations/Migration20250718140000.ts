import { Migration } from '@mikro-orm/migrations';

export class Migration20250718140000 extends Migration {

  async up(): Promise<void> {
    // Add the new pricing columns to the existing table (with conditional checks)
    this.addSql(`
      do $$ begin
        if not exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'raw_gross_price') then
          alter table "supplier_price_list_item" add column "raw_gross_price" jsonb null;
        end if;
      end $$;
    `);
    
    this.addSql(`
      do $$ begin
        if not exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'raw_discount_amount') then
          alter table "supplier_price_list_item" add column "raw_discount_amount" jsonb null;
        end if;
      end $$;
    `);
    
    this.addSql(`
      do $$ begin
        if not exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'discount_percentage') then
          alter table "supplier_price_list_item" add column "discount_percentage" numeric null;
        end if;
      end $$;
    `);
    
    this.addSql(`
      do $$ begin
        if not exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'raw_net_price') then
          alter table "supplier_price_list_item" add column "raw_net_price" jsonb null;
        end if;
      end $$;
    `);
    
    // Add constraint to ensure only one discount type is used (with conditional check)
    this.addSql(`
      do $$ begin
        if not exists (select 1 from information_schema.table_constraints where table_name = 'supplier_price_list_item' and constraint_name = 'supplier_price_list_item_discount_type_check') then
          alter table "supplier_price_list_item" 
          add constraint "supplier_price_list_item_discount_type_check" 
          check (
            (raw_discount_amount is null and discount_percentage is null) or
            (raw_discount_amount is not null and discount_percentage is null) or
            (raw_discount_amount is null and discount_percentage is not null)
          );
        end if;
      end $$;
    `);
    
    // Add constraint to ensure discount percentage is between 0 and 100 (with conditional check)
    this.addSql(`
      do $$ begin
        if not exists (select 1 from information_schema.table_constraints where table_name = 'supplier_price_list_item' and constraint_name = 'supplier_price_list_item_discount_percentage_range_check') then
          alter table "supplier_price_list_item" 
          add constraint "supplier_price_list_item_discount_percentage_range_check" 
          check (discount_percentage is null or (discount_percentage >= 0 and discount_percentage <= 100));
        end if;
      end $$;
    `);
    
    // Copy existing cost_price values to net_price for backward compatibility
    this.addSql('update "supplier_price_list_item" set "raw_net_price" = "raw_cost_price" where "raw_net_price" is null and "raw_cost_price" is not null;');
    
    // Make net_price required (only if the column exists and has been populated)
    this.addSql(`
      do $$ begin
        if exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'raw_net_price') then
          alter table "supplier_price_list_item" alter column "raw_net_price" set not null;
        end if;
      end $$;
    `);
    
    // Drop the old cost_price columns (with conditional checks)
    this.addSql(`
      do $$ begin
        if exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'cost_price') then
          alter table "supplier_price_list_item" drop column "cost_price";
        end if;
      end $$;
    `);
    
    this.addSql(`
      do $$ begin
        if exists (select 1 from information_schema.columns where table_name = 'supplier_price_list_item' and column_name = 'raw_cost_price') then
          alter table "supplier_price_list_item" drop column "raw_cost_price";
        end if;
      end $$;
    `);
  }

  async down(): Promise<void> {
    // Re-add the old cost_price columns
    this.addSql('alter table "supplier_price_list_item" add column "cost_price" numeric not null default 0;');
    this.addSql('alter table "supplier_price_list_item" add column "raw_cost_price" jsonb not null default \'{"value": 0, "precision": 20}\';');
    
    // Copy net_price values back to cost_price for backward compatibility
    this.addSql('update "supplier_price_list_item" set "raw_cost_price" = "raw_net_price" where "raw_cost_price" is null;');
    
    // Drop constraints
    this.addSql('alter table "supplier_price_list_item" drop constraint if exists "supplier_price_list_item_discount_percentage_range_check";');
    this.addSql('alter table "supplier_price_list_item" drop constraint if exists "supplier_price_list_item_discount_type_check";');
    
    // Drop the new pricing columns
    this.addSql('alter table "supplier_price_list_item" drop column "raw_gross_price";');
    this.addSql('alter table "supplier_price_list_item" drop column "raw_discount_amount";');
    this.addSql('alter table "supplier_price_list_item" drop column "discount_percentage";');
    this.addSql('alter table "supplier_price_list_item" drop column "raw_net_price";');
  }

}