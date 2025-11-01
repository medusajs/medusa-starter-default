# Price List Import Quick Reference

## Dutch Fixed-Width Format

### Create Template

```bash
npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=SUP_ID
```

### Column Layout

| Position | Width | Field | Transformation | Target |
|----------|-------|-------|----------------|--------|
| 0-18 | 18 | Onderdeelnummer | - | supplier_sku |
| 18-58 | 40 | Omschrijving | - | description |
| 58-59 | 1 | Prijscode | - | metadata.price_code |
| 59-60 | 1 | Material Status | - | metadata.material_status |
| 60-68 | 8 | Datum | YYYYMMDD→YYYY-MM-DD | metadata.last_price_update |
| 68-79 | 11 | Lijstprijs | ÷ 100 | net_price |
| 79-92 | 13 | Gewicht | ÷ 1000 | metadata.weight |
| 92-97 | 5 | Verpakkingseenheid | - | metadata.packaging_unit |
| 97-101 | 4 | First Product Line | - | metadata.product_line |
| 101-102 | 1 | SDC | - | metadata.sdc |
| 102-107 | 5 | PCC | - | metadata.pcc |
| 107-112 | 5 | MPC | - | metadata.mpc |
| 107-110 | 3 | MPC (substring) | First 3 chars | metadata.mpl |
| 112-113 | 1 | Retour | - | metadata.return_indicator |

### Sample Row

```
PART-001-12345678 HYDRAULIC PUMP ASSEMBLY MODEL XL-2000  A Y20250115  0000123450000001234567 00001HPMP1234512345N000
```

Becomes:

```json
{
  "supplier_sku": "PART-001-12345678",
  "description": "HYDRAULIC PUMP ASSEMBLY MODEL XL-2000",
  "net_price": 1234.50,
  "metadata": {
    "price_code": "A",
    "material_status": "Y",
    "last_price_update": "2025-01-15",
    "weight": 1.234567,
    "packaging_unit": "00001",
    "product_line": "HPMP",
    "mpc": "12345",
    "mpl": "123",
    "pcc": "12345",
    "sdc": "1",
    "return_indicator": "N"
  }
}
```

## Available Transformations

| Type | Parameters | Example | Result |
|------|-----------|---------|--------|
| `divide` | `divisor: number` | `{ type: "divide", divisor: 100 }` | 12345 → 123.45 |
| `multiply` | `multiplier: number` | `{ type: "multiply", multiplier: 2 }` | 10 → 20 |
| `trim` | - | `{ type: "trim" }` | " text " → "text" |
| `uppercase` | - | `{ type: "uppercase" }` | "text" → "TEXT" |
| `lowercase` | - | `{ type: "lowercase" }` | "TEXT" → "text" |
| `substring` | `start, length?` | `{ type: "substring", start: 0, length: 3 }` | "12345" → "123" |
| `date` | `input_format` | `{ type: "date", input_format: "YYYYMMDD" }` | "20250115" → "2025-01-15" |

## API Endpoints

### List Templates
```bash
GET /admin/suppliers/{supplier_id}/price-lists/import-templates
```

### Get Template
```bash
GET /admin/suppliers/{supplier_id}/price-lists/import-templates/{template_id}
```

### Create Template
```bash
POST /admin/suppliers/{supplier_id}/price-lists/import-templates
{
  "name": "Template Name",
  "file_type": "txt",
  "parse_config": { ... },
  "column_mapping": { ... }
}
```

### Update Template
```bash
PUT /admin/suppliers/{supplier_id}/price-lists/import-templates/{template_id}
{
  "name": "Updated Name",
  "parse_config": { ... }
}
```

### Import Price List
```bash
POST /admin/suppliers/{supplier_id}/price-lists/import
{
  "name": "Price List Name",
  "file_content": "...",
  "parse_config": { ... },
  "column_mapping": { ... }
}
```

## Common Issues

### "Product variant not found"
→ Create SupplierProduct records or ensure variant SKUs match

### "net_price is required"
→ Check column positions and transformations

### "Line shorter than expected"
→ Verify file format and skip_rows setting

### Prices are wrong (off by 100x)
→ Verify divide transformation is applied

## Field Aliases (Dutch)

The system automatically recognizes these Dutch field names:

- `onderdeelnummer` → supplier_sku
- `omschrijving` / `omschrijving onderdeel` → description
- `lijstprijs` → net_price
- `artikelnummer` → supplier_sku
- `categorie` → category

## Workflow

1. **Create Supplier** → Admin UI or API
2. **Create Template** → Run script or API
3. **Link Products** → Create SupplierProduct records
4. **Import File** → Admin UI or API
5. **Review Results** → Check import summary

## Files

- **Guide**: `src/modules/purchasing/docs/dutch-supplier-price-list-guide.md`
- **Sample**: `src/modules/purchasing/docs/dutch-supplier-sample.txt`
- **Script**: `src/scripts/create-dutch-supplier-template.ts`
- **Types**: `src/modules/purchasing/types/parser-types.ts`

