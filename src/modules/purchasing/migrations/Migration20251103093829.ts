import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251103093829 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order" add column if not exists "type" text check ("type" in ('stock', 'rush')) not null default 'stock';`);
    
    this.addSql(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                     WHERE constraint_name = 'purchase_order_type_check' 
                     AND table_name = 'purchase_order') THEN
        ALTER TABLE purchase_order ADD CONSTRAINT purchase_order_type_check 
        CHECK(type IN ('stock', 'rush'));
      END IF;
    END $$;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order" drop constraint if exists "purchase_order_type_check";`);
    this.addSql(`alter table if exists "purchase_order" drop column if exists "type";`);
  }

}

