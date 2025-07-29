import { Migration } from '@mikro-orm/migrations';

export class Migration20250115000000 extends Migration {

  override async up(): Promise<void> {
    // First, drop the existing service_type constraint to allow updates
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_service_type_check";`);

    // Now update existing records to use new service types
    // Update existing records to use 'standard' instead of 'normal'
    this.addSql(`update "service_order" set "service_type" = 'standard' where "service_type" = 'normal';`);
    
    // Update existing records to use 'standard' instead of 'setup'
    this.addSql(`update "service_order" set "service_type" = 'standard' where "service_type" = 'setup';`);
    
    // Update existing records to use 'standard' instead of 'emergency'
    this.addSql(`update "service_order" set "service_type" = 'standard' where "service_type" = 'emergency';`);
    
    // Update existing records to use 'standard' instead of 'preventive'
    this.addSql(`update "service_order" set "service_type" = 'standard' where "service_type" = 'preventive';`);

    // Finally, add the new service_type constraint with updated values
    this.addSql(`alter table if exists "service_order" add constraint "service_order_service_type_check" check("service_type" in ('insurance', 'warranty', 'internal', 'standard', 'sales_prep', 'quote'));`);
  }

  override async down(): Promise<void> {
    // Drop the new service_type constraint
    this.addSql(`alter table if exists "service_order" drop constraint if exists "service_order_service_type_check";`);

    // Revert existing records back to 'normal'
    this.addSql(`update "service_order" set "service_type" = 'normal' where "service_type" = 'standard';`);

    // Restore the original service_type constraint
    this.addSql(`alter table if exists "service_order" add constraint "service_order_service_type_check" check("service_type" in ('normal', 'warranty', 'setup', 'emergency', 'preventive'));`);
  }

} 