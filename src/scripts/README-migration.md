# Brand Data Migration Scripts

This directory contains scripts to migrate existing data to the new brand-aware variants and supplier brand system.

## Overview

These scripts help transition from the old system to the brand-aware system by:

1. **Variant Brand Backfill**: Assigns brands to variants based on their parent product's brand assignments
2. **Supplier Brand Backfill**: Infers supplier-brand relationships from existing SupplierProduct data

## Safety Features

- **Dry run mode by default** - Scripts run in read-only mode unless explicitly disabled
- **Comprehensive logging** - All operations are logged with timestamps
- **Batch processing** - Large datasets are processed in small batches to prevent timeouts
- **Error handling** - Scripts continue processing even if individual records fail
- **Result reporting** - Detailed summaries show what was changed

## Scripts

### 1. Individual Scripts

#### Variant Brand Backfill (`backfill-variant-brands.ts`)
```bash
# Dry run (safe, no changes)
npm run medusa-develop -- exec ./src/scripts/backfill-variant-brands.ts --dry-run

# Live run (makes actual changes)
npm run medusa-develop -- exec ./src/scripts/backfill-variant-brands.ts --no-dry-run

# With debug logging
npm run medusa-develop -- exec ./src/scripts/backfill-variant-brands.ts --dry-run --debug

# Limit products processed
npm run medusa-develop -- exec ./src/scripts/backfill-variant-brands.ts --dry-run --limit=100
```

#### Supplier Brand Backfill (`backfill-supplier-brands.ts`)
```bash
# Dry run (safe, no changes)
npm run medusa-develop -- exec ./src/scripts/backfill-supplier-brands.ts --dry-run

# Live run with minimum threshold
npm run medusa-develop -- exec ./src/scripts/backfill-supplier-brands.ts --no-dry-run --threshold=3

# Debug mode
npm run medusa-develop -- exec ./src/scripts/backfill-supplier-brands.ts --dry-run --debug
```

### 2. Combined Migration Script (`migrate-brand-data.ts`)

The master script that runs both migrations with additional safety features:

```bash
# Full dry run (recommended first step)
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts

# Dry run with debug output
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --debug

# Live migration (after verifying dry run results)
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --no-dry-run

# Skip variant migration, only do suppliers
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --skip-variants

# Save results to custom file
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --output=./my-results.json

# Continue even if some records fail
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --continue-on-error
```

## Migration Process

### Step 1: Preparation
1. **Backup your database** - Always create a full backup before running live migrations
2. **Review existing data** - Understand your current product-brand and supplier-product relationships
3. **Test on staging** - Run the migration on a staging environment first

### Step 2: Dry Run Analysis
```bash
# Run full dry run with debug output
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --debug --output=./dry-run-results.json
```

Review the results file to understand:
- How many variants will be updated
- Which suppliers will get brand assignments  
- Any potential issues or conflicts

### Step 3: Live Migration
```bash
# Run the actual migration
npm run medusa-develop -- exec ./src/scripts/migrate-brand-data.ts --no-dry-run --output=./migration-results.json
```

The script will:
- Ask for confirmation before making changes
- Process data in small batches
- Log all operations
- Generate a detailed results report

## Understanding the Migration Logic

### Variant Brand Assignment
- If a product has **exactly one brand**, all its variants inherit that brand
- If a product has **multiple brands**, variants are left unchanged (manual review needed)
- If a product has **no brands**, variants are skipped

### Supplier Brand Assignment
- Script analyzes all variants supplied by each supplier
- Identifies which brands those variants belong to
- Creates supplier-brand links for brands with sufficient variant count
- Uses configurable threshold (default: 1 variant minimum)

## Error Handling

Scripts are designed to be robust:
- Individual record failures don't stop the entire process
- All errors are logged with context
- Scripts can be re-run safely (idempotent)
- Existing links are not duplicated

## Monitoring Progress

All scripts provide detailed logging:

```
[2025-01-XX] [INFO] Starting variant brand backfill (dry-run: true)
[2025-01-XX] [INFO] Found 450 products to process
[2025-01-XX] [DEBUG] Processing batch 1/18
[2025-01-XX] [DEBUG] Product prod_123 has single brand Bosch, assigning to 3 variants
[2025-01-XX] [INFO] [DRY RUN] Created 3 brand links for product Product Name
```

## Output Files

Result files contain detailed information:
```json
{
  "startTime": "2025-01-XX",
  "endTime": "2025-01-XX", 
  "duration": 45000,
  "success": true,
  "variantResults": {
    "processed": 450,
    "updated": 234,
    "skipped": 216,
    "summary": {
      "singleBrandProducts": 234,
      "multiBrandProducts": 12,
      "noBrandProducts": 204
    }
  },
  "supplierResults": {
    "processed": 89,
    "updated": 45,
    "summary": {
      "totalBrandLinks": 156
    }
  },
  "errors": []
}
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure the database user has necessary permissions
   - Check that the Link service is properly configured

2. **Timeout Issues**
   - Reduce batch sizes by modifying the scripts
   - Process subsets using limit parameters

3. **Memory Issues**
   - Use smaller batch sizes
   - Process data in multiple runs with filters

### Recovery

If a migration fails partway through:
- Check the output file to see what was completed
- The scripts are idempotent - you can re-run them safely
- Use `--continue-on-error` to skip problematic records

## Post-Migration Verification

After running the migration:

1. **Check data integrity**:
   ```sql
   -- Count variants with brands
   SELECT COUNT(*) FROM product_variant_brand_link;
   
   -- Count suppliers with brands  
   SELECT COUNT(*) FROM supplier_brand_link;
   ```

2. **Test admin interface** - Verify that brand information displays correctly

3. **Test price list imports** - Ensure brand-constrained imports work as expected

## Support

If you encounter issues:
1. Check the output logs and files
2. Verify your database schema matches the expected structure
3. Review the `.medusa-source` patterns for link definitions
4. Test with smaller datasets first