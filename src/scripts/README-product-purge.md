# Product Purge Script

A comprehensive script to safely remove all products and variants from your Medusa application, giving you a clean slate to start fresh.

## ⚠️ Safety Features

This script includes multiple safety mechanisms to prevent accidental data loss:

1. **Explicit Confirmation Required**: You must explicitly confirm the purge operation
2. **Dry Run Mode**: Preview what would be deleted without actually deleting anything
3. **Batch Processing**: Processes deletions in manageable batches
4. **Error Handling**: Individual retry logic for failed deletions
5. **Verification**: Confirms cleanup after completion

## 🚀 Usage

### Dry Run (Recommended First)

Always start with a dry run to see what would be deleted:

```bash
# See what would be deleted without actually deleting
yarn seed purge-products '{"dryRun": true}'
```

### Actual Purge

Once you've confirmed the dry run output, proceed with the actual deletion:

```bash
# Permanently delete all products and variants
yarn seed purge-products '{"confirmPurge": true}'
```

### Advanced Options

You can customize the purge behavior with additional options:

```bash
# Custom batch size (default: 50)
yarn seed purge-products '{"confirmPurge": true, "batchSize": 25}'

# Dry run with custom batch size
yarn seed purge-products '{"dryRun": true, "batchSize": 100}'
```

## 📋 Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `confirmPurge` | boolean | `false` | Must be `true` to actually delete products |
| `dryRun` | boolean | `false` | Preview deletions without executing them |
| `batchSize` | number | `50` | Number of products to process per batch |

## 🔍 What Gets Deleted

The script will remove:

- ✅ **All Products**: Every product in your Medusa database
- ✅ **All Product Variants**: All variants associated with products
- ✅ **Associated Data**: Prices, inventory levels, and related product data
- ✅ **Metadata**: Custom metadata attached to products and variants

## 📊 Output Example

### Dry Run Output
```
🔍 DRY RUN MODE - No data will be deleted
📊 Found 150 products to process
📊 Found 423 variants across all products
🔍 DRY RUN - Would delete the following:
  📦 Product: Widget Pro (widget-pro) - 3 variants
    📋 Variant: Widget Pro - Small (SKU: WGT-PRO-SM)
    📋 Variant: Widget Pro - Medium (SKU: WGT-PRO-MD)
    📋 Variant: Widget Pro - Large (SKU: WGT-PRO-LG)
  ... and 147 more products
🔍 DRY RUN COMPLETE - Run with confirmPurge: true to execute deletion
```

### Actual Purge Output
```
⚠️  DESTRUCTIVE OPERATION - This will permanently delete ALL products and variants
📊 Found 150 products to process
📊 Found 423 variants across all products
🗑️  Starting deletion process...
🔄 Processing batch 1/3 (50 products)...
  ✅ Deleted: Widget Pro (widget-pro)
  ✅ Deleted: Super Tool (super-tool)
  ✅ Deleted: Amazing Product (amazing-product)
  ✅ ... and 47 more products in this batch
📈 Progress: 50/150 products deleted (33%)
...
🎉 PURGE OPERATION COMPLETED
============================
✅ Successfully deleted: 150 products
📊 Total processed: 150 products
✅ VERIFICATION: Database is now clean - no products remaining
```

## 🛡️ Safety Considerations

### Before Running
1. **Backup Your Database**: Always create a backup before purging
2. **Test in Development**: Run this script in a development environment first
3. **Dry Run First**: Always run with `dryRun: true` before the actual purge
4. **Check Dependencies**: Ensure no critical business data depends on these products

### After Running
1. **Verify Results**: The script will show verification results
2. **Check Related Data**: Manually verify that related systems aren't affected
3. **Restart Services**: Consider restarting your Medusa server after large purges

## 🔧 Technical Details

### How It Works
1. **Discovery**: Lists all products and variants in the database
2. **Validation**: Counts and categorizes what will be deleted
3. **Batch Processing**: Divides products into manageable batches
4. **Workflow Integration**: Uses Medusa's native `deleteProductsWorkflow`
5. **Error Recovery**: Retries individual deletions if batch operations fail
6. **Verification**: Confirms successful cleanup

### Performance Considerations
- Default batch size of 50 balances speed and reliability
- Smaller batches (25-30) for systems with many product relationships
- Larger batches (75-100) for simple product catalogs
- Individual retry logic prevents single failed products from blocking entire batches

## 🚨 Troubleshooting

### Common Issues

**"No products found - database is already clean"**
- Your database doesn't contain any products to delete
- This is the expected state after a successful purge

**"Failed to delete: X products"**
- Some products have dependencies that prevent deletion
- Check the detailed logs to identify specific issues
- May need to manually remove dependencies first

**"SAFETY CHECK: You must explicitly confirm purge"**
- You forgot to add `confirmPurge: true` or `dryRun: true`
- Add one of these options to proceed

### Recovery Options

If you need to restore data after purging:
1. Restore from your database backup
2. Re-run your product import scripts
3. Use the parts import script if you were working with parts data

## 📝 Integration with Other Scripts

This purge script works well with:
- `load-parts-with-prices.ts` - Import parts after purging
- `seed.ts` - Re-seed sample data after cleanup
- Product import workflows - Fresh start for new catalogs

## ⚡ Quick Commands Reference

```bash
# Preview what would be deleted
yarn seed purge-products '{"dryRun": true}'

# Actually delete everything
yarn seed purge-products '{"confirmPurge": true}'

# Check if database is clean (should show no products)
yarn seed list-products
``` 