# Dutch Supplier Fixed-Width Price List Import

## Quick Start

This solution provides a **flexible, database-driven approach** to importing fixed-width price lists from Dutch suppliers, avoiding hardcoded Python scripts.

### What Was Built

✅ **Enhanced Parser System** with new transformation types:
- `substring` - Extract substrings (e.g., MPL from MPC)
- `date` - Parse dates from YYYYMMDD format

✅ **Automatic Metadata Collection** - Non-standard fields are automatically stored in `metadata` JSON field

✅ **Template Creation Script** - One-command setup for Dutch supplier format

✅ **Comprehensive Documentation** - Full guide with examples and troubleshooting

### The MedusaJS Way™

Instead of hardcoding parsing logic like this Python code:

```python
col_widths = [18, 40, 1, 1, 8, 11, 13, 5, 4, 1, 5, 5, 1, 3]
data['Lijstprijs'] = data['Lijstprijs'].astype(float) / 100
data['Gewicht onderdeel in kg'] = data['Gewicht onderdeel in kg'].astype(float) / 1000
data['MPL'] = data['MPC'].astype(str).str[0:3]
```

You now have a **reusable, configurable system** that:

1. **Stores configurations in the database** (no code changes needed)
2. **Supports transformations** (divide, substring, date parsing)
3. **Integrates with admin UI** (non-technical users can import)
4. **Handles multiple suppliers** (each with their own templates)
5. **Collects extra data** (metadata for supplier-specific fields)

## Usage

### 1. Create the Import Template

```bash
# Replace sup_xxxxx with your actual supplier ID
npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_xxxxx
```

This creates a template with:
- Fixed-width column definitions (18, 40, 1, 1, 8, 11, 13, 5, 4, 1, 5, 5, 1, 3)
- Price transformation (÷ 100)
- Weight transformation (÷ 1000)
- Date parsing (YYYYMMDD → YYYY-MM-DD)
- MPL derivation (first 3 chars of MPC)

### 2. Link Products

Create supplier product mappings:

```typescript
POST /admin/suppliers/{supplier_id}/products
{
  "product_variant_id": "variant_xxxxx",
  "supplier_sku": "PART-001-12345678",
  "cost_price": 0
}
```

### 3. Import Price List

**Via Admin UI:**
1. Go to Suppliers → [Your Supplier] → Price Lists
2. Click "Import Price List"
3. Select "Dutch Fixed-Width Price List" template
4. Upload your `.txt` file

**Via API:**
```bash
POST /admin/suppliers/{supplier_id}/price-lists/import
{
  "name": "Q1 2025 Price List",
  "file_content": "...",
  "parse_config": { /* from template */ },
  "column_mapping": { /* from template */ }
}
```

## What Gets Imported

Each row in your file:

```
PART-001-12345678 HYDRAULIC PUMP ASSEMBLY MODEL XL-2000  A Y20250115  0000123450000001234567 00001HPMP1234512345N000
```

Becomes a `SupplierPriceListItem`:

```typescript
{
  supplier_sku: "PART-001-12345678",
  description: "HYDRAULIC PUMP ASSEMBLY MODEL XL-2000",
  net_price: 1234.50,  // Automatically divided by 100
  metadata: {
    price_code: "A",
    material_status: "Y",
    last_price_update: "2025-01-15",  // Parsed from 20250115
    weight: 1.234567,  // Automatically divided by 1000
    packaging_unit: "00001",
    product_line: "HPMP",
    mpc: "12345",
    mpl: "123",  // Derived from MPC
    pcc: "12345",
    sdc: "1",
    return_indicator: "N"
  }
}
```

## Key Features

### 1. No Hardcoding

All configuration is stored in the database and can be modified via API:

```bash
PUT /admin/suppliers/{supplier_id}/price-lists/import-templates/{template_id}
```

### 2. Reusable Templates

Create once, use many times. Templates can be:
- Shared across imports
- Updated without code changes
- Versioned for different formats
- Cloned for similar suppliers

### 3. Flexible Transformations

The system supports:
- **Numeric**: `divide`, `multiply`
- **String**: `trim`, `uppercase`, `lowercase`, `substring`
- **Date**: Parse from various formats
- **Custom**: Easy to add new transformation types

### 4. Metadata Storage

Non-standard fields are automatically collected into the `metadata` JSON field, so you never lose data.

### 5. Error Handling

Detailed error messages for each row:
- "Product variant not found"
- "Invalid net_price value"
- "Line shorter than expected"

## Files Created/Modified

### New Files

1. **`src/scripts/create-dutch-supplier-template.ts`**
   - Script to create the import template
   - Configures column widths, mappings, and transformations

2. **`src/modules/purchasing/docs/dutch-supplier-price-list-guide.md`**
   - Comprehensive guide with examples
   - Troubleshooting section
   - Best practices

3. **`src/modules/purchasing/docs/dutch-supplier-sample.txt`**
   - Sample price list file
   - Demonstrates the format

### Modified Files

1. **`src/modules/purchasing/types/parser-types.ts`**
   - Added `substring` transformation type
   - Added `date` transformation type
   - Added `metadata` field to `ParsedPriceListItem`

2. **`src/modules/purchasing/steps/parse-fixed-width-price-list.ts`**
   - Implemented `substring` transformation handler
   - Implemented `date` transformation handler
   - Added automatic metadata collection for unmapped fields

3. **`src/modules/purchasing/config/field-aliases.ts`**
   - Added Dutch field name aliases
   - "artikelnummer", "omschrijving onderdeel"

## Example: Complete Flow

```bash
# 1. Create supplier (if not exists)
curl -X POST http://localhost:9000/admin/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dutch Parts Supplier B.V.",
    "code": "DPS",
    "currency_code": "EUR"
  }'

# 2. Create import template
npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_abc123

# 3. Link products (repeat for each product)
curl -X POST http://localhost:9000/admin/suppliers/sup_abc123/products \
  -H "Content-Type: application/json" \
  -d '{
    "product_variant_id": "variant_xyz789",
    "supplier_sku": "PART-001-12345678",
    "cost_price": 0
  }'

# 4. Import price list (via Admin UI or API)
# See documentation for full API example
```

## Testing

Use the sample file to test the import:

```bash
# Sample file location:
src/modules/purchasing/docs/dutch-supplier-sample.txt

# Contains 5 sample rows with various field values
```

## Advantages Over Python Script

| Python Script | MedusaJS Solution |
|--------------|-------------------|
| Hardcoded column widths | Configurable in database |
| Requires code changes | Update via API |
| One-off solution | Reusable templates |
| No UI integration | Admin UI support |
| Manual data mapping | Automatic metadata collection |
| Limited error handling | Detailed row-by-row errors |
| Single format | Multiple formats per supplier |

## Next Steps

1. **Create your supplier** in the system
2. **Run the template script** with your supplier ID
3. **Link your products** to supplier SKUs
4. **Test with sample file** to verify parsing
5. **Import real price list** via Admin UI

## Documentation

- **Full Guide**: `src/modules/purchasing/docs/dutch-supplier-price-list-guide.md`
- **Sample File**: `src/modules/purchasing/docs/dutch-supplier-sample.txt`
- **Parser Types**: `src/modules/purchasing/types/parser-types.ts`
- **Template Script**: `src/scripts/create-dutch-supplier-template.ts`

## Support

For issues or questions:
1. Check the comprehensive guide in `docs/dutch-supplier-price-list-guide.md`
2. Review error messages in import logs
3. Test with the sample file first
4. Verify template configuration via API

## Technical Details

### Transformation Pipeline

1. **Parse** → Extract fields from fixed positions
2. **Transform** → Apply transformations (divide, substring, date)
3. **Map** → Map to standard fields using column_mapping
4. **Collect** → Gather unmapped fields into metadata
5. **Validate** → Check required fields and product existence
6. **Store** → Save as SupplierPriceListItem

### Extensibility

To add new transformation types:

1. Update type definition in `parser-types.ts`:
```typescript
| { type: "my_transform", param: string }
```

2. Add handler in `parse-fixed-width-price-list.ts`:
```typescript
case 'my_transform':
  return myCustomTransform(value, transformation.param)
```

3. Use in templates:
```typescript
transformations: {
  "my_field": { type: "my_transform", param: "value" }
}
```

---

**Built with MedusaJS v2** - Following framework best practices for extensibility and maintainability.

