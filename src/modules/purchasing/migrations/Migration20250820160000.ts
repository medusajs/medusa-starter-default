import { Migration } from '@mikro-orm/migrations';

export class Migration20250820160000 extends Migration {

	async up(): Promise<void> {
		// Ensure numeric columns exist to match model (bigNumber creates numeric + raw_*)
		this.addSql(`
		  do $$ begin
		    if not exists (
		      select 1 from information_schema.columns 
		      where table_name = 'supplier_price_list_item' and column_name = 'net_price'
		    ) then
		      alter table "supplier_price_list_item" add column "net_price" numeric not null default 0;
		    end if;
		  end $$;
		`);

		this.addSql(`
		  do $$ begin
		    if not exists (
		      select 1 from information_schema.columns 
		      where table_name = 'supplier_price_list_item' and column_name = 'gross_price'
		    ) then
		      alter table "supplier_price_list_item" add column "gross_price" numeric null;
		    end if;
		  end $$;
		`);

		this.addSql(`
		  do $$ begin
		    if not exists (
		      select 1 from information_schema.columns 
		      where table_name = 'supplier_price_list_item' and column_name = 'discount_amount'
		    ) then
		      alter table "supplier_price_list_item" add column "discount_amount" numeric null;
		    end if;
		  end $$;
		`);

		// If we still have legacy cost columns, copy into net_price for continuity
		this.addSql(`
		  do $$ begin
		    if exists (
		      select 1 from information_schema.columns 
		      where table_name = 'supplier_price_list_item' and column_name = 'cost_price'
		    ) then
		      update "supplier_price_list_item" 
		      set "net_price" = coalesce("net_price", "cost_price")
		      where "cost_price" is not null;
		    end if;
		  end $$;
		`);
	}

	async down(): Promise<void> {
		// Do not drop columns to avoid data loss; keep down no-op or safe
	}
}



