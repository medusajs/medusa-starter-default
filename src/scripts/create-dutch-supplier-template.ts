/**
 * Create Dutch Supplier Fixed-Width Import Template
 * 
 * This script creates a reusable import template for a Dutch supplier
 * whose price lists use fixed-width format with specific column positions.
 * 
 * Based on the Python parsing logic:
 * - Fixed column widths for each field
 * - Price values need to be divided by 100
 * - Weight values need to be divided by 1000
 * - Date parsing from YYYYMMDD format
 * - Derived MPL field from MPC substring
 * 
 * Usage:
 *   npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_xxxxx
 */

import { ExecArgs } from "@medusajs/framework/types"
import { PURCHASING_MODULE } from "../modules/purchasing"

type ScriptArgs = {
  "supplier-id": string
}

export default async function createDutchSupplierTemplate({ 
  container, 
  args 
}: ExecArgs<ScriptArgs>) {
  const purchasingService = container.resolve(PURCHASING_MODULE)
  
  const supplierId = args["supplier-id"]
  
  if (!supplierId) {
    console.error("❌ Error: --supplier-id is required")
    console.log("Usage: npx medusa exec ./src/scripts/create-dutch-supplier-template.ts -- --supplier-id=sup_xxxxx")
    return
  }

  console.log(`\n🔧 Creating Dutch supplier import template for supplier: ${supplierId}\n`)

  try {
    // Verify supplier exists
    const suppliers = await purchasingService.listSuppliers({ id: supplierId })
    if (suppliers.length === 0) {
      console.error(`❌ Supplier with ID "${supplierId}" not found`)
      return
    }
    
    const supplier = suppliers[0]
    console.log(`✅ Found supplier: ${supplier.name}`)

    // Define the fixed-width column configuration
    // Based on: col_widths = [18, 40, 1, 1, 8, 11, 13, 5, 4, 1, 5, 5, 1, 3]
    const fixedWidthColumns = [
      { name: "onderdeelnummer", start: 0, width: 18 },           // Supplier part number
      { name: "omschrijving", start: 18, width: 40 },             // Description
      { name: "prijscode", start: 58, width: 1 },                 // Price code
      { name: "material_status", start: 59, width: 1 },           // Material status
      { name: "datum_prijsaanpassing", start: 60, width: 8 },     // Last price update date (YYYYMMDD)
      { name: "lijstprijs", start: 68, width: 11 },               // List price (needs /100)
      { name: "gewicht_kg", start: 79, width: 13 },               // Weight in kg (needs /1000)
      { name: "verpakkingseenheid", start: 92, width: 5 },        // Packaging unit
      { name: "first_product_line", start: 97, width: 4 },        // First product line
      { name: "sdc", start: 101, width: 1 },                      // SDC
      { name: "pcc", start: 102, width: 5 },                      // PCC
      { name: "mpc", start: 107, width: 5 },                      // MPC (first 3 chars become MPL)
      { name: "retour_indicator", start: 112, width: 1 },         // Return indicator
      { name: "niet_gebruikt", start: 113, width: 3 },            // Not used
    ]

    // Column mapping: parsed column name → target field
    // Fields mapped to standard ParsedPriceListItem properties
    const columnMapping = {
      "onderdeelnummer": "supplier_sku",
      "omschrijving": "description",
      "lijstprijs": "net_price",           // Using net_price as the main price field
      
      // All other fields will be automatically collected into metadata
      // These mappings just give them cleaner names
      "gewicht_kg": "weight",              // Will be in metadata
      "prijscode": "price_code",           // Will be in metadata
      "material_status": "material_status", // Will be in metadata
      "datum_prijsaanpassing": "last_price_update", // Will be in metadata
      "verpakkingseenheid": "packaging_unit", // Will be in metadata
      "first_product_line": "product_line", // Will be in metadata
      "mpc": "mpc",                        // Will be in metadata
      "mpc_mpl": "mpl",                    // Derived field (first 3 chars of MPC)
      "pcc": "pcc",                        // Will be in metadata
      "sdc": "sdc",                        // Will be in metadata
      "retour_indicator": "return_indicator", // Will be in metadata
    }

    // Transformations to apply to parsed fields
    // These run BEFORE column mapping
    const transformations = {
      // Price: divide by 100 (stored in cents, displayed as euros)
      "lijstprijs": { type: "divide" as const, divisor: 100 },
      
      // Weight: divide by 1000 (convert to kg)
      "gewicht_kg": { type: "divide" as const, divisor: 1000 },
      
      // Date: convert from YYYYMMDD to YYYY-MM-DD
      "datum_prijsaanpassing": { type: "date" as const, input_format: "YYYYMMDD" },
      
      // MPL: extract first 3 characters from MPC
      // We create a "virtual" column by duplicating MPC and transforming it
      "mpc_mpl": { type: "substring" as const, start: 0, length: 3 },
    }

    // Add virtual column for MPL (derived from MPC)
    fixedWidthColumns.push({
      name: "mpc_mpl",
      start: 107,  // Same as MPC
      width: 5,    // Same as MPC (will be trimmed to 3 by substring transformation)
    })

    // Parse configuration
    const parseConfig = {
      format_type: "fixed-width" as const,
      skip_rows: 1, // Skip header row
      fixed_width_columns: fixedWidthColumns,
      transformations: transformations,
    }

    // Create the template
    const template = await purchasingService.createImportTemplate({
      supplier_id: supplierId,
      name: "Dutch Fixed-Width Price List",
      description: "Fixed-width format parser for Dutch supplier price lists. Includes automatic transformations for prices (/100) and weights (/1000). Extracts MPL from MPC field.",
      file_type: "txt",
      parse_config: parseConfig,
      column_mapping: columnMapping,
    })

    console.log(`\n✅ Template created successfully!`)
    console.log(`   Template ID: ${template.id}`)
    console.log(`   Template Name: ${template.name}`)
    console.log(`\n📋 Configuration Summary:`)
    console.log(`   - Format: Fixed-width text file`)
    console.log(`   - Columns: ${fixedWidthColumns.length}`)
    console.log(`   - Skip rows: 1`)
    console.log(`   - Primary identifier: supplier_sku (onderdeelnummer)`)
    console.log(`\n💡 Usage:`)
    console.log(`   1. Go to Admin UI → Suppliers → ${supplier.name}`)
    console.log(`   2. Navigate to Price Lists tab`)
    console.log(`   3. Click "Import Price List"`)
    console.log(`   4. Select this template from the dropdown`)
    console.log(`   5. Upload your fixed-width .txt file`)
    console.log(`\n⚠️  Important Notes:`)
    console.log(`   - Prices will be automatically divided by 100 (stored in cents)`)
    console.log(`   - Weights will be automatically divided by 1000`)
    console.log(`   - Date format: YYYYMMDD (e.g., 20250101)`)
    console.log(`   - MPL field will be derived from first 3 characters of MPC`)
    console.log(`   - Make sure products exist with matching supplier_sku before importing`)
    console.log(`\n🔗 Next Steps:`)
    console.log(`   1. Create SupplierProduct records linking supplier SKUs to your variants`)
    console.log(`   2. Or ensure your product variants have SKUs matching the onderdeelnummer`)
    console.log(`   3. Upload a test file to verify the parsing works correctly`)
    
  } catch (error: any) {
    console.error(`\n❌ Error creating template:`, error.message)
    if (error.message.includes('already exists')) {
      console.log(`\n💡 Tip: A template with this name already exists. You can:`)
      console.log(`   1. Use a different name`)
      console.log(`   2. Delete the existing template first`)
      console.log(`   3. Update the existing template instead`)
    }
  }
}

