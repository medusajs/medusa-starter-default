### Supplier Price List CSV Specification

This document defines the CSV format for supplier price list imports. It mirrors current parsing and processing logic and follows Medusa v2 module conventions.

#### Columns
- **variant_sku**: string (optional, but required if `product_id` is empty)
- **product_id**: string (optional, but required if `variant_sku` is empty)
- **supplier_sku**: string (optional)
- **cost_price**: number (required; dot as decimal separator)
- **quantity**: integer (optional; default 1; must be >= 1)
- **lead_time_days**: integer (optional; must be >= 0)
- **notes**: string (optional)
- **brand_code**: string (optional; only used when `MEDUSA_FF_BRAND_AWARE_PURCHASING=true`)

At least one of `variant_sku` or `product_id` must be provided per row. If both are provided, `variant_sku` takes precedence.

#### Validation Rules
- Required fields: `cost_price` AND at least one of (`variant_sku`, `product_id`).
- `cost_price` must be a valid number (e.g., 25.50). Rows with invalid values are rejected with a clear error message.
- `quantity` defaults to 1 when missing or invalid. Must be a positive integer when provided.
- `lead_time_days` must be an integer >= 0 when provided.
- When `variant_sku` is provided, the variant must exist. When only `product_id` is provided, the product must exist and have at least one variant; the first variant will be used.
- When `MEDUSA_FF_BRAND_AWARE_PURCHASING=true` and `brand_code` is provided, the variant lookup is constrained to the brand; otherwise, matching behaves as current.

#### Processing Behavior
- Parsed rows are transformed to price list items. The CSV field `cost_price` maps to the model field `net_price`.
- The system upserts supplier-product relations based on the resolved `product_variant_id`.
- Errors encountered per row are collected and returned in the workflow response.

#### CSV Format
- Comma-separated, double-quote supported for fields containing commas or quotes.
- Header row is required and must match the column names above.
- Example header: `variant_sku,product_id,supplier_sku,cost_price,quantity,lead_time_days,notes`

#### Examples
Example rows:
```
PROD-001-VAR,prod_01234567890123456789,SUP-SKU-001,25.50,1,14,Example product variant
PROD-002-VAR,,SUP-SKU-002,15.75,5,7,Another example with quantity
,,SUP-SKU-003,30.00,1,21,Example with notes only
```

When `MEDUSA_FF_BRAND_AWARE_PURCHASING=true`, the header may include `brand_code` and rows may provide it as an additional disambiguation hint.


