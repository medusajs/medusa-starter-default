# Parts with Price History Import Script

This script imports parts data with price history from a CSV file into Medusa as products and variants.

## CSV Format Expected

The script expects a CSV file with the following columns:

```
part_number,part_name,part_amount,part_discount_code_id,part_group_id,part_color_id,price_value,price_deleted,price_created_at,price_updated_at
```

### Column Descriptions

- `part_number`: Unique identifier for the part (will become the SKU)
- `part_name`: Human-readable name for the part
- `part_amount`: Quantity/amount for the part (default: 1.0)
- `part_discount_code_id`: Optional discount code reference
- `part_group_id`: Optional group categorization
- `part_color_id`: Optional color categorization
- `price_value`: The price value (in your base currency)
- `price_deleted`: Boolean indicating if this price record is deleted
- `price_created_at`: When this price was created
- `price_updated_at`: When this price was last updated

## How It Works

1. **Groups Records**: The script groups all CSV rows by `part_number` to consolidate price history
2. **Creates Products**: Each unique part becomes a Medusa product
3. **Single Variant**: Each product gets one variant with the part number as SKU
4. **Latest Price**: Uses the most recent non-deleted price as the current price
5. **Price History**: Stores all price changes in the variant's metadata for historical tracking

## Usage

1. Place your CSV file in the project root as `parts-prices.csv`

2. Run the script:
```bash
npx medusa exec src/scripts/load-parts-with-prices.ts
```

## Generated Product Structure

Each part becomes a Medusa product with:

- **Title**: `{part_name} ({part_number})`
- **Handle**: Generated from part number and name
- **SKU**: `part_number`
- **Description**: Includes part number and quantity
- **Status**: Published (ready for use)
- **Price**: Latest non-deleted price in EUR cents

## Metadata Stored

### Product Metadata
- `part_number`: Original part number
- `part_group_id`: Group categorization
- `part_color_id`: Color categorization
- `total_price_changes`: Number of price history records
- `import_source`: "parts-csv-import"
- `import_date`: When the import ran

### Variant Metadata
- `part_amount`: Quantity/amount value
- `part_discount_code_id`: Discount code reference
- `part_group_id`: Group categorization
- `part_color_id`: Color categorization
- `price_history`: JSON array of all price changes with timestamps
- `latest_price`: Current price value
- `latest_price_date`: When current price was set

## Features

- **Duplicate Detection**: Skips parts that already exist (by handle)
- **Error Handling**: Continues processing even if individual records fail
- **Batch Processing**: Processes parts in batches of 50 for performance
- **Progress Tracking**: Shows detailed progress and statistics
- **Price Validation**: Validates prices and dates before import
- **Price History**: Preserves complete price change timeline

## Error Handling

The script includes comprehensive error handling:

- Skips records with missing essential data
- Validates price and date formats
- Handles duplicate parts gracefully
- Provides detailed error logging
- Attempts individual creation if batch fails

## Sample CSV Data

```csv
part_number,part_name,part_amount,part_discount_code_id,part_group_id,part_color_id,price_value,price_deleted,price_created_at,price_updated_at
28010055,"Zuigaansluiting 1 1/2""",1.0,,,,16.46,False,2020-12-12 20:09:41.415244,2020-12-12 20:09:41.415244
28010055,"Zuigaansluiting 1 1/2""",1.0,,,,13.81,False,2020-12-04 22:18:11.870553,2020-12-04 22:18:11.870553
```

## Output Example

```
[INFO] Starting parts with price history import process...
[INFO] Found 18 price records in CSV file
[INFO] Grouped into 1 unique parts
[INFO] Creating batch 1 with 1 products...
[INFO] Created 1 products. Progress: 100%
[INFO]   ✓ Created: Zuigaansluiting 1 1/2" (28010055) (Handle: 28010055-zuigaansluiting-1-1-2)
[INFO] Import completed!
[INFO] Created: 1 products
[INFO] Skipped: 0 products
[INFO] Total parts processed: 1
[INFO] Average price changes per part: 18.0
```

## Notes

- Prices are stored in cents (EUR by default)
- The script uses the default sales channel
- Price history is preserved in metadata for reporting/analysis
- Products are set to "Published" status and available immediately
- The script can be run multiple times safely (skips existing products) 