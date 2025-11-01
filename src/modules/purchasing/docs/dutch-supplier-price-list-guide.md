# Dutch Supplier Fixed-Width Price List Import Guide

## Overview

This guide explains how to import price lists from suppliers that use fixed-width text file formats, specifically designed for Dutch suppliers with formats similar to the example below.

## The Problem

You have a supplier whose price lists come in a fixed-width text format like this:

```
Onderdeelnummer   Omschrijving onderdeel                  P M Datum   Lijstprijs  Gewicht    Verp FPL S PCC  MPC  R Nie
123456789012345678PRODUCT DESCRIPTION HERE              X Y20250101  0000123450000001234567 00050ABCD1234512345X123
```

Each field has a specific position and width, and values need transformations (e.g., prices divided by 100, dates parsed from YYYYMMDD format).

## The MedusaJS Solution

Instead of hardcoding Python scripts or custom parsers, MedusaJS provides a **flexible, reusable import template system** that:

1. ✅ Stores parser configurations in the database
2. ✅ Supports fixed-width and CSV formats
3. ✅ Handles data transformations (divide, multiply, substring, date parsing)
4. ✅ Automatically collects extra fields into metadata
5. ✅ Can be reused and modified without code changes
6. ✅ Integrates with the admin UI

## Step-by-Step Setup

### Step 1: Create Your Supplier

First, ensure your supplier exists in the system:

```bash
# Via Admin UI: Suppliers → Create Supplier
# Or via API:
POST /admin/suppliers
{
  "name": "Dutch Parts Supplier B.V.",
  "code": "DPS",
  "currency_code": "EUR"
}
```

### Step 2: Run the Template Creation Script

Use the provided script to create the import template:

```bash
npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_xxxxx
```

Replace `sup_xxxxx` with your actual supplier ID.

This script creates a template with:

- **Fixed-width column definitions** matching your supplier's format
- **Automatic transformations**:
  - Prices divided by 100 (stored in cents)
  - Weights divided by 1000 (converted to kg)
  - Dates parsed from YYYYMMDD to YYYY-MM-DD
  - MPL derived from first 3 characters of MPC
- **Field mappings** from Dutch names to standard fields
- **Metadata collection** for supplier-specific fields

### Step 3: Link Products to Supplier SKUs

Before importing, you need to establish the relationship between your products and the supplier's part numbers. You have two options:

#### Option A: Use Supplier Products (Recommended)

Create `SupplierProduct` records that link supplier SKUs to your product variants:

```typescript
// Via API:
POST /admin/suppliers/{supplier_id}/products
{
  "product_variant_id": "variant_xxxxx",
  "supplier_sku": "123456789012345678",
  "cost_price": 12.34,
  "currency_code": "EUR"
}
```

#### Option B: Match by Product Variant SKU

Ensure your product variants have SKUs that match the supplier's `onderdeelnummer`:

```typescript
// Set your variant SKU to match supplier's part number
variant.sku = "123456789012345678"
```

### Step 4: Import the Price List

#### Via Admin UI:

1. Navigate to **Suppliers** → Select your supplier
2. Go to **Price Lists** tab
3. Click **Import Price List**
4. Select **"Dutch Fixed-Width Price List"** template
5. Upload your `.txt` file
6. Review the preview
7. Click **Import**

#### Via API:

```bash
POST /admin/suppliers/{supplier_id}/price-lists/import
Content-Type: application/json

{
  "name": "Q1 2025 Price List",
  "description": "Quarterly price update",
  "file_content": "...", // Base64 or raw text content
  "file_name": "prijslijst_2025_q1.txt",
  "parse_config": {
    "format_type": "fixed-width",
    "skip_rows": 1,
    "fixed_width_columns": [ /* from template */ ]
  },
  "column_mapping": { /* from template */ },
  "currency_code": "EUR"
}
```

## Understanding the Data Flow

### 1. File Parsing

The fixed-width parser reads your file and extracts fields based on column positions:

```
Position 0-18:  onderdeelnummer (supplier SKU)
Position 18-58: omschrijving (description)
Position 68-79: lijstprijs (price, needs /100)
... etc
```

### 2. Transformations

Before mapping, transformations are applied:

```typescript
// Price: 0000123450 → 1234.50
lijstprijs: { type: "divide", divisor: 100 }

// Weight: 0001234567 → 1234.567
gewicht_kg: { type: "divide", divisor: 1000 }

// Date: 20250101 → 2025-01-01
datum_prijsaanpassing: { type: "date", input_format: "YYYYMMDD" }

// MPL: 12345 → 123
mpc_mpl: { type: "substring", start: 0, length: 3 }
```

### 3. Column Mapping

Transformed values are mapped to standard fields:

```typescript
{
  "onderdeelnummer": "supplier_sku",      // Standard field
  "omschrijving": "description",          // Standard field
  "lijstprijs": "net_price",              // Standard field (required)
  "gewicht_kg": "weight",                 // → metadata.weight
  "mpc": "mpc",                           // → metadata.mpc
  "mpl": "mpl",                           // → metadata.mpl
  // ... other fields go to metadata
}
```

### 4. Product Matching

The system tries to find your product variant using:

1. `variant_sku` (if provided)
2. `supplier_sku` (via SupplierProduct records)
3. `product_id` (if provided)

### 5. Data Storage

Each row becomes a `SupplierPriceListItem`:

```typescript
{
  price_list_id: "...",
  product_variant_id: "variant_xxxxx",
  supplier_sku: "123456789012345678",
  net_price: 1234.50,
  description: "PRODUCT DESCRIPTION HERE",
  metadata: {
    weight: 1234.567,
    price_code: "X",
    material_status: "Y",
    last_price_update: "2025-01-01",
    packaging_unit: "00050",
    product_line: "ABCD",
    mpc: "12345",
    mpl: "123",
    pcc: "12345",
    sdc: "1",
    return_indicator: "X"
  }
}
```

## Customizing the Template

### Modifying an Existing Template

You can update the template via API:

```bash
PUT /admin/suppliers/{supplier_id}/price-lists/import-templates/{template_id}
{
  "name": "Updated Template Name",
  "parse_config": { /* updated config */ },
  "column_mapping": { /* updated mapping */ }
}
```

### Creating Additional Templates

If you have multiple file formats from the same supplier, create multiple templates:

```bash
npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_xxxxx
# Then modify the script or create a new one for different formats
```

### Adding New Transformation Types

The system supports these transformation types:

- `divide` - Divide numeric values
- `multiply` - Multiply numeric values
- `trim` - Remove whitespace
- `uppercase` - Convert to uppercase
- `lowercase` - Convert to lowercase
- `substring` - Extract substring (start, length)
- `date` - Parse dates (input_format: "YYYYMMDD")

To add new transformation types, update:
1. `src/modules/purchasing/types/parser-types.ts` (add type)
2. `src/modules/purchasing/steps/parse-fixed-width-price-list.ts` (add handler)

## Troubleshooting

### "Product variant not found"

**Cause**: No product variant matches the supplier SKU.

**Solutions**:
1. Create SupplierProduct records linking SKUs to variants
2. Ensure variant SKUs match supplier part numbers
3. Check if brand filtering is enabled and variants have correct brand

### "net_price is required"

**Cause**: The price field couldn't be parsed or is missing.

**Solutions**:
1. Verify column positions are correct
2. Check if transformation is applied correctly
3. Ensure the file format matches the template

### "Line shorter than expected"

**Cause**: Some lines in the file are shorter than the defined column positions.

**Solutions**:
1. Check if the file has trailing spaces removed
2. Verify the `skip_rows` setting is correct
3. Ensure the file encoding is correct (UTF-8)

### Prices are wrong (off by 100x)

**Cause**: The divide transformation might not be applied.

**Solutions**:
1. Verify the transformation is in the template
2. Check if the field name matches exactly
3. Ensure transformations run before column mapping

## Advanced: Metadata Usage

All non-standard fields are automatically stored in the `metadata` JSON field. You can:

### Query by Metadata

```typescript
// Find all items with specific MPC
const items = await purchasingService.listSupplierPriceListItems({
  price_list_id: "...",
  metadata: {
    mpc: "12345"
  }
})
```

### Display in Admin UI

Create custom components to display metadata fields:

```typescript
// In your admin extension
<MetadataDisplay item={priceListItem}>
  <Field label="Weight" value={item.metadata?.weight} />
  <Field label="MPC" value={item.metadata?.mpc} />
  <Field label="MPL" value={item.metadata?.mpl} />
</MetadataDisplay>
```

### Use in Workflows

Access metadata in custom workflows:

```typescript
const item = await purchasingService.retrieveSupplierPriceListItem(itemId)
const mpl = item.metadata?.mpl
const productLine = item.metadata?.product_line
// Use for business logic...
```

## Best Practices

1. **Test with a small file first** - Import 10-20 rows to verify the configuration
2. **Use descriptive template names** - "Dutch Fixed-Width Q1 2025" vs "Template 1"
3. **Document custom fields** - Add descriptions for metadata fields
4. **Version your templates** - Keep old templates when formats change
5. **Validate before import** - Use the preview feature to check parsing
6. **Monitor import logs** - Check for warnings and errors after import
7. **Keep supplier SKU mappings updated** - Maintain SupplierProduct records

## Example: Complete Import Flow

```bash
# 1. Create supplier
POST /admin/suppliers
{
  "name": "Dutch Parts Supplier",
  "code": "DPS",
  "currency_code": "EUR"
}
# Response: { id: "sup_abc123" }

# 2. Create import template
npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_abc123

# 3. Link products
POST /admin/suppliers/sup_abc123/products
{
  "product_variant_id": "variant_xyz789",
  "supplier_sku": "123456789012345678",
  "cost_price": 0
}

# 4. Import price list (via UI or API)
POST /admin/suppliers/sup_abc123/price-lists/import
{
  "name": "Q1 2025",
  "file_content": "...",
  "parse_config": { /* from template */ },
  "column_mapping": { /* from template */ }
}

# 5. Review results
GET /admin/suppliers/sup_abc123/price-lists
```

## Related Documentation

- [Price List Import Workflow](./price-list-csv.md)
- [Parser Configuration](../config/parser-templates.ts)
- [Field Aliases](../config/field-aliases.ts)
- [Transformation Types](../types/parser-types.ts)

## Support

If you encounter issues or need help customizing the parser:

1. Check the import logs for detailed error messages
2. Review the template configuration
3. Test with a minimal example file
4. Consult the MedusaJS documentation at https://docs.medusajs.com

