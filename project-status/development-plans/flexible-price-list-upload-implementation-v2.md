# Flexible Price List Upload Implementation Plan (MedusaJS v2 Native)

## Overview

Implement a flexible, supplier-specific price list upload system that handles diverse file formats (CSV, fixed-width TXT) without breaking when suppliers change their format. This implementation uses **native MedusaJS v2 patterns** including workflow steps, service methods, and metadata storage.

## Business Context

- **Target Users**: 5 suppliers initially, less technical users (trainable)
- **Format Stability**: Supplier formats change infrequently
- **File Types**: CSV, fixed-width TXT files (no Excel initially)
- **Future**: AI-powered format detection (budget permitting)

## Current State

**Location**: `src/modules/purchasing/steps/parse-price-list-csv.ts`

**Problems**:
- Hardcoded CSV parser with fixed column names (variant_sku, cost_price, etc.)
- No supplier-specific format handling
- Breaks with different file formats or column structures
- Cannot handle fixed-width TXT files like Caterpillar format

**Example Problematic Format** (Fixed-width TXT):
```
CNEUR30NL_BE20251015
0000140520        LAGER                                   #02025010200000009250000000000347000001AJ15CF429C42010Y
```

Column structure:
- Onderdeelnummer (0-18): Supplier SKU
- Omschrijving onderdeel (18-58): Description
- Lijstprijs (69-82): Price (13 chars)
- etc. (14 columns total with specific widths)

---

## Solution Architecture (MedusaJS v2 Native)

### Core Principles

1. **Use Workflow Steps**: Parser logic encapsulated in workflow steps with compensation
2. **Service Methods**: Business logic in PurchasingService (extends MedusaService)
3. **Metadata Storage**: Parser config stored in `supplier.metadata.price_list_parser`
4. **Container Resolution**: All dependencies resolved via Medusa container
5. **No External Libraries**: Use Node.js built-in features for parsing

### Architecture Components

#### 1. Parser Strategy Pattern (Workflow Steps)

Instead of separate parser classes, create **workflow steps** for each parser type:
- `parseCsvPriceListStep` - Handles delimited files
- `parseFixedWidthPriceListStep` - Handles fixed-column files
- `detectParserConfigStep` - Resolves parser configuration

Each step follows MedusaJS patterns:
- Uses `createStep` from `@medusajs/workflows-sdk`
- Returns `StepResponse` with parsed data
- Includes compensation logic for rollback
- Resolves services via container

#### 2. Service Methods (PurchasingService)

Add methods to `src/modules/purchasing/service.ts`:

```typescript
class PurchasingService extends MedusaService({...}) {

  // Parser configuration management
  async getSupplierParserConfig(supplierId: string)
  async updateSupplierParserConfig(supplierId: string, config: ParserConfig)
  async detectParserFromContent(fileContent: string, fileName: string)

  // Template management
  async listParserTemplates()
  async getParserTemplate(templateName: string)

  // Column matching utilities
  async matchColumnsToFields(headers: string[], fieldAliases: Record<string, string[]>)
  async validateParserConfig(config: ParserConfig)
}
```

#### 3. Supplier Metadata Configuration

**Storage**: `supplier.metadata.price_list_parser` (already exists, no migration needed)

**Schema**:
```json
{
  "price_list_parser": {
    "type": "csv" | "fixed-width",
    "template_name": "generic-csv" | "caterpillar-fixed-width",
    "config": {
      // Common fields
      "has_header": true,
      "skip_rows": 1,

      // CSV-specific
      "delimiter": ",",
      "quote_char": "\"",
      "column_mapping": {
        "supplier_sku": "Onderdeelnummer",
        "cost_price": "Lijstprijs",
        "description": "Omschrijving onderdeel"
      },

      // Fixed-width specific
      "fixed_width_columns": [
        { "field": "supplier_sku", "start": 0, "width": 18 },
        { "field": "description", "start": 18, "width": 40 },
        { "field": "cost_price", "start": 69, "width": 13 }
      ],

      // Field transformations
      "transformations": {
        "cost_price": {
          "type": "divide",
          "divisor": 100000
        },
        "supplier_sku": {
          "type": "trim"
        }
      }
    }
  }
}
```

#### 4. Pre-configured Templates

**Storage**: Hard-coded in service (no JSON files needed - simpler deployment)

Templates defined in `src/modules/purchasing/config/parser-templates.ts`:

```typescript
export const PARSER_TEMPLATES = {
  "generic-csv": {
    name: "Generic CSV",
    type: "csv",
    config: {
      delimiter: ",",
      has_header: true,
      column_mapping: {
        supplier_sku: ["supplier_sku", "sku", "part_number", "onderdeelnummer"],
        cost_price: ["cost_price", "price", "net_price", "lijstprijs"],
        // ... more mappings with aliases
      }
    }
  },
  "caterpillar-fixed-width": {
    name: "Caterpillar Fixed Width",
    type: "fixed-width",
    config: {
      skip_rows: 1,
      fixed_width_columns: [
        { field: "supplier_sku", start: 0, width: 18 },
        { field: "description", start: 18, width: 40 },
        { field: "cost_price", start: 69, width: 13 },
        // ... more columns
      ],
      transformations: {
        cost_price: { type: "divide", divisor: 100000 },
        supplier_sku: { type: "trim" }
      }
    }
  }
}
```

#### 5. Smart Column Matching

Utility functions in service for fuzzy matching:

```typescript
// Field aliases (hard-coded, editable by developers only)
const FIELD_ALIASES = {
  supplier_sku: ["sku", "part_number", "part_no", "partnumber", "onderdeelnummer"],
  cost_price: ["price", "cost", "net_price", "unit_price", "lijstprijs"],
  variant_sku: ["variant_sku", "internal_sku", "our_sku"],
  description: ["description", "desc", "name", "omschrijving"],
  // ... more aliases
}
```

---

## Implementation Plan

### Phase 1: Core Parser Infrastructure

#### 1.1 Create Parser Types & Config

**Files to Create**:
- `src/modules/purchasing/types/parser-types.ts`
- `src/modules/purchasing/config/parser-templates.ts`
- `src/modules/purchasing/config/field-aliases.ts`

**Content**:
```typescript
// parser-types.ts
export type ParserType = "csv" | "fixed-width"

export type ParserConfig = {
  type: ParserType
  template_name?: string
  config: CsvConfig | FixedWidthConfig
}

export type CsvConfig = {
  delimiter: string
  quote_char: string
  has_header: boolean
  skip_rows: number
  column_mapping: Record<string, string | string[]>
  transformations?: Record<string, Transformation>
}

export type FixedWidthConfig = {
  skip_rows: number
  fixed_width_columns: Array<{
    field: string
    start: number
    width: number
  }>
  transformations?: Record<string, Transformation>
}

export type Transformation =
  | { type: "divide", divisor: number }
  | { type: "multiply", multiplier: number }
  | { type: "trim" }
  | { type: "uppercase" }
  | { type: "lowercase" }

export type ParsedPriceListItem = {
  product_variant_id?: string
  product_id?: string
  supplier_sku?: string
  variant_sku?: string
  cost_price: number
  description?: string
  quantity?: number
  lead_time_days?: number
  notes?: string
}

export type ParseResult = {
  items: ParsedPriceListItem[]
  errors: string[]
  total_rows: number
  processed_rows: number
  warnings?: string[]
}
```

---

#### 1.2 Add Service Methods

**File to Modify**: `src/modules/purchasing/service.ts`

**Add Methods**:
```typescript
class PurchasingService extends MedusaService({...}) {

  // ==========================================
  // PARSER CONFIGURATION MANAGEMENT
  // ==========================================

  async getSupplierParserConfig(supplierId: string): Promise<ParserConfig | null> {
    const supplier = await this.retrieveSupplier(supplierId, {
      select: ["id", "metadata"]
    })

    return supplier?.metadata?.price_list_parser || null
  }

  async updateSupplierParserConfig(
    supplierId: string,
    config: ParserConfig
  ): Promise<void> {
    const supplier = await this.retrieveSupplier(supplierId)

    const updatedMetadata = {
      ...supplier.metadata,
      price_list_parser: config
    }

    await this.updateSuppliers(
      { id: supplierId },
      { metadata: updatedMetadata }
    )
  }

  async listParserTemplates(): Promise<ParserTemplate[]> {
    return Object.entries(PARSER_TEMPLATES).map(([key, value]) => ({
      id: key,
      ...value
    }))
  }

  async getParserTemplate(templateName: string): Promise<ParserConfig | null> {
    const template = PARSER_TEMPLATES[templateName]
    if (!template) return null

    return {
      type: template.type,
      template_name: templateName,
      config: template.config
    }
  }

  async detectParserFromContent(
    fileContent: string,
    fileName: string
  ): Promise<ParserType> {
    // Simple detection based on file extension and content
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'csv' || extension === 'tsv') {
      return 'csv'
    }

    if (extension === 'txt') {
      // Check if content has delimiters
      const firstLine = fileContent.split('\n')[0]
      if (firstLine.includes(',') || firstLine.includes('\t')) {
        return 'csv'
      }
      return 'fixed-width'
    }

    // Default to CSV
    return 'csv'
  }

  async matchColumnsToFields(
    headers: string[],
    fieldAliases: Record<string, string[]>
  ): Promise<Record<string, string>> {
    const mapping: Record<string, string> = {}

    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().trim().replace(/[_\s-]/g, '')

        for (const alias of aliases) {
          const normalizedAlias = alias.toLowerCase().trim().replace(/[_\s-]/g, '')

          if (normalizedHeader === normalizedAlias ||
              normalizedHeader.includes(normalizedAlias) ||
              normalizedAlias.includes(normalizedHeader)) {
            mapping[field] = header
            break
          }
        }

        if (mapping[field]) break
      }
    }

    return mapping
  }

  async validateParserConfig(config: ParserConfig): Promise<{ valid: boolean, errors: string[] }> {
    const errors: string[] = []

    if (!config.type) {
      errors.push("Parser type is required")
    }

    if (config.type === 'csv') {
      const csvConfig = config.config as CsvConfig
      if (!csvConfig.delimiter) {
        errors.push("CSV delimiter is required")
      }
    }

    if (config.type === 'fixed-width') {
      const fwConfig = config.config as FixedWidthConfig
      if (!fwConfig.fixed_width_columns || fwConfig.fixed_width_columns.length === 0) {
        errors.push("Fixed-width columns are required")
      }
    }

    return { valid: errors.length === 0, errors }
  }
}
```

---

#### 1.3 Create CSV Parser Step

**File to Create**: `src/modules/purchasing/steps/parse-csv-price-list.ts`

**Content**:
```typescript
import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CsvConfig, ParsedPriceListItem, ParseResult } from "../types/parser-types"
import { FIELD_ALIASES } from "../config/field-aliases"

type ParseCsvPriceListStepInput = {
  file_content: string
  supplier_id: string
  brand_id?: string
  config: CsvConfig
}

// Simple CSV parser for comma-separated values with proper quote handling
function parseCSV(csvContent: string, delimiter: string = ','): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0], delimiter)
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter)
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function applyTransformation(value: any, transformation: any): any {
  if (!transformation) return value

  switch (transformation.type) {
    case 'divide':
      return parseFloat(value) / transformation.divisor
    case 'multiply':
      return parseFloat(value) * transformation.multiplier
    case 'trim':
      return String(value).trim()
    case 'uppercase':
      return String(value).toUpperCase()
    case 'lowercase':
      return String(value).toLowerCase()
    default:
      return value
  }
}

export const parseCsvPriceListStep = createStep(
  "parse-csv-price-list-step",
  async (input: ParseCsvPriceListStepInput, { container }): Promise<ParseResult> => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const remoteQuery = container.resolve("REMOTE_QUERY") as any
    const purchasingService = container.resolve("purchasingService")
    const featureFlag = process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING === "true"

    const { config, file_content, supplier_id, brand_id } = input

    // Skip rows if configured
    const lines = file_content.split('\n')
    const contentToProcess = config.skip_rows > 0
      ? lines.slice(config.skip_rows).join('\n')
      : file_content

    const csvRows = parseCSV(contentToProcess, config.delimiter)
    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Auto-match columns if mapping uses arrays (aliases)
    let columnMapping = config.column_mapping
    if (csvRows.length > 0) {
      const headers = Object.keys(csvRows[0])
      const autoMapping = await purchasingService.matchColumnsToFields(headers, FIELD_ALIASES)

      // Merge auto-detected mapping with explicit mapping
      columnMapping = { ...autoMapping, ...config.column_mapping }
    }

    // Determine allowed brand ids for the supplier if feature enabled
    let allowedBrandIds: string[] | null = null
    if (featureFlag) {
      try {
        const supplierWithBrands = await remoteQuery({
          entryPoint: "supplier",
          fields: ["id", "brands.id"],
          variables: { filters: { id: supplier_id } },
        })
        const supplier = Array.isArray(supplierWithBrands) ? supplierWithBrands[0] : supplierWithBrands
        const supplierBrandIds: string[] = (supplier?.brands || []).map((b: any) => b.id)

        if (brand_id) {
          allowedBrandIds = supplierBrandIds.includes(brand_id) ? [brand_id] : []
        } else {
          allowedBrandIds = supplierBrandIds
        }
      } catch (e: any) {
        errors.push(`Failed to load supplier brands: ${e.message || e}`)
        if (brand_id) {
          return new StepResponse({ items: [], errors, total_rows: csvRows.length, processed_rows: 0, warnings })
        }
      }
    }

    // Process rows
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      const rowNum = i + 2 + (config.skip_rows || 0) // Adjust for skipped rows and header

      try {
        // Map columns using column_mapping
        const mappedRow: any = {}
        for (const [field, columnName] of Object.entries(columnMapping)) {
          if (typeof columnName === 'string') {
            mappedRow[field] = row[columnName]
          } else if (Array.isArray(columnName)) {
            // Try each alias
            for (const alias of columnName) {
              if (row[alias] !== undefined) {
                mappedRow[field] = row[alias]
                break
              }
            }
          }
        }

        // Apply transformations
        if (config.transformations) {
          for (const [field, transformation] of Object.entries(config.transformations)) {
            if (mappedRow[field] !== undefined) {
              mappedRow[field] = applyTransformation(mappedRow[field], transformation)
            }
          }
        }

        // Validate required fields
        if (!mappedRow.variant_sku && !mappedRow.supplier_sku && !mappedRow.product_id) {
          errors.push(`Row ${rowNum}: Either variant_sku, supplier_sku, or product_id is required`)
          continue
        }

        if (!mappedRow.cost_price) {
          errors.push(`Row ${rowNum}: cost_price is required`)
          continue
        }

        // Parse cost price
        const costPrice = parseFloat(mappedRow.cost_price)
        if (isNaN(costPrice)) {
          errors.push(`Row ${rowNum}: Invalid cost_price value`)
          continue
        }

        // Find product variant (reuse existing logic from parse-price-list-csv.ts)
        let productVariant = null
        let product = null

        if (mappedRow.variant_sku) {
          const variantFilters: any = { sku: mappedRow.variant_sku }
          const variantConfig: any = { select: ["id", "product_id", "sku"], relations: ["product"] }

          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            variantFilters["brand.id"] = allowedBrandIds
            variantConfig.relations = ["product", "brand"]
          }

          const variants = await productModuleService.listProductVariants(variantFilters, variantConfig)

          if (variants.length === 0) {
            // Try searching by supplier_sku if available
            if (mappedRow.supplier_sku) {
              warnings.push(`Row ${rowNum}: Variant SKU "${mappedRow.variant_sku}" not found, will search by supplier_sku`)
              // Continue to supplier_sku search below
            } else {
              const brandMsg = featureFlag ? " for supplier's allowed brands" : ""
              errors.push(`Row ${rowNum}: Product variant with SKU "${mappedRow.variant_sku}" not found${brandMsg}`)
              continue
            }
          } else {
            productVariant = variants[0]
            product = productVariant.product
          }
        }

        // If not found by variant_sku, try supplier_sku (search in supplier_products)
        if (!productVariant && mappedRow.supplier_sku) {
          const supplierProducts = await purchasingService.listSupplierProducts({
            supplier_id: supplier_id,
            supplier_sku: mappedRow.supplier_sku
          })

          if (supplierProducts.length > 0) {
            const supplierProduct = supplierProducts[0]
            const variants = await productModuleService.listProductVariants({
              id: supplierProduct.product_variant_id
            })
            if (variants.length > 0) {
              productVariant = variants[0]
              const products = await productModuleService.listProducts({ id: productVariant.product_id })
              product = products[0]
            }
          }
        }

        // If still not found and product_id provided
        if (!productVariant && mappedRow.product_id) {
          const products = await productModuleService.listProducts(
            { id: mappedRow.product_id },
            { relations: ["variants"] }
          )

          if (products.length === 0) {
            errors.push(`Row ${rowNum}: Product with ID "${mappedRow.product_id}" not found`)
            continue
          }

          product = products[0]
          if (product.variants && product.variants.length > 0) {
            productVariant = product.variants[0]
          } else {
            errors.push(`Row ${rowNum}: Product has no variants`)
            continue
          }
        }

        if (!productVariant || !product) {
          errors.push(`Row ${rowNum}: Could not resolve product variant`)
          continue
        }

        // Parse optional fields
        const quantity = mappedRow.quantity ? parseInt(mappedRow.quantity) : 1
        const leadTimeDays = mappedRow.lead_time_days ? parseInt(mappedRow.lead_time_days) : undefined

        const processedItem: ParsedPriceListItem = {
          product_variant_id: productVariant.id,
          product_id: product.id,
          supplier_sku: mappedRow.supplier_sku || undefined,
          variant_sku: productVariant.sku || undefined,
          cost_price: costPrice,
          description: mappedRow.description || undefined,
          quantity: isNaN(quantity) ? 1 : quantity,
          lead_time_days: leadTimeDays,
          notes: mappedRow.notes || undefined,
        }

        processedItems.push(processedItem)

      } catch (error) {
        errors.push(`Row ${rowNum}: Error processing row - ${error.message}`)
      }
    }

    return new StepResponse({
      items: processedItems,
      errors,
      warnings,
      total_rows: csvRows.length,
      processed_rows: processedItems.length
    })
  }
)
```

---

#### 1.4 Create Fixed-Width Parser Step

**File to Create**: `src/modules/purchasing/steps/parse-fixed-width-price-list.ts`

**Content**:
```typescript
import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { FixedWidthConfig, ParsedPriceListItem, ParseResult } from "../types/parser-types"

type ParseFixedWidthPriceListStepInput = {
  file_content: string
  supplier_id: string
  brand_id?: string
  config: FixedWidthConfig
}

function extractFixedWidthFields(line: string, columns: Array<{ field: string, start: number, width: number }>): Record<string, string> {
  const row: Record<string, string> = {}

  for (const column of columns) {
    const end = column.start + column.width
    const value = line.substring(column.start, end)
    row[column.field] = value
  }

  return row
}

function applyTransformation(value: any, transformation: any): any {
  if (!transformation) return value

  switch (transformation.type) {
    case 'divide':
      return parseFloat(value) / transformation.divisor
    case 'multiply':
      return parseFloat(value) * transformation.multiplier
    case 'trim':
      return String(value).trim()
    case 'uppercase':
      return String(value).toUpperCase()
    case 'lowercase':
      return String(value).toLowerCase()
    default:
      return value
  }
}

export const parseFixedWidthPriceListStep = createStep(
  "parse-fixed-width-price-list-step",
  async (input: ParseFixedWidthPriceListStepInput, { container }): Promise<ParseResult> => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const remoteQuery = container.resolve("REMOTE_QUERY") as any
    const purchasingService = container.resolve("purchasingService")
    const featureFlag = process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING === "true"

    const { config, file_content, supplier_id, brand_id } = input

    const lines = file_content.split('\n').filter(line => line.trim())

    // Skip rows if configured
    const startIndex = config.skip_rows || 0
    const dataLines = lines.slice(startIndex)

    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Determine allowed brand ids (same as CSV parser)
    let allowedBrandIds: string[] | null = null
    if (featureFlag) {
      try {
        const supplierWithBrands = await remoteQuery({
          entryPoint: "supplier",
          fields: ["id", "brands.id"],
          variables: { filters: { id: supplier_id } },
        })
        const supplier = Array.isArray(supplierWithBrands) ? supplierWithBrands[0] : supplierWithBrands
        const supplierBrandIds: string[] = (supplier?.brands || []).map((b: any) => b.id)

        if (brand_id) {
          allowedBrandIds = supplierBrandIds.includes(brand_id) ? [brand_id] : []
        } else {
          allowedBrandIds = supplierBrandIds
        }
      } catch (e: any) {
        errors.push(`Failed to load supplier brands: ${e.message || e}`)
        if (brand_id) {
          return new StepResponse({ items: [], errors, total_rows: dataLines.length, processed_rows: 0, warnings })
        }
      }
    }

    // Process lines
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const rowNum = i + 1 + startIndex

      try {
        // Extract fields based on fixed-width columns
        const row = extractFixedWidthFields(line, config.fixed_width_columns)

        // Apply transformations
        if (config.transformations) {
          for (const [field, transformation] of Object.entries(config.transformations)) {
            if (row[field] !== undefined) {
              row[field] = applyTransformation(row[field], transformation)
            }
          }
        }

        // Validate required fields
        if (!row.variant_sku && !row.supplier_sku && !row.product_id) {
          errors.push(`Row ${rowNum}: Either variant_sku, supplier_sku, or product_id is required`)
          continue
        }

        if (!row.cost_price) {
          errors.push(`Row ${rowNum}: cost_price is required`)
          continue
        }

        // Parse cost price
        const costPrice = parseFloat(row.cost_price)
        if (isNaN(costPrice)) {
          errors.push(`Row ${rowNum}: Invalid cost_price value: "${row.cost_price}"`)
          continue
        }

        // Find product variant (reuse same logic as CSV parser)
        let productVariant = null
        let product = null

        // Try by variant_sku
        if (row.variant_sku && row.variant_sku.trim()) {
          const variantFilters: any = { sku: row.variant_sku.trim() }
          const variantConfig: any = { select: ["id", "product_id", "sku"], relations: ["product"] }

          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            variantFilters["brand.id"] = allowedBrandIds
            variantConfig.relations = ["product", "brand"]
          }

          const variants = await productModuleService.listProductVariants(variantFilters, variantConfig)

          if (variants.length > 0) {
            productVariant = variants[0]
            product = productVariant.product
          }
        }

        // Try by supplier_sku if not found
        if (!productVariant && row.supplier_sku && row.supplier_sku.trim()) {
          const supplierProducts = await purchasingService.listSupplierProducts({
            supplier_id: supplier_id,
            supplier_sku: row.supplier_sku.trim()
          })

          if (supplierProducts.length > 0) {
            const supplierProduct = supplierProducts[0]
            const variants = await productModuleService.listProductVariants({
              id: supplierProduct.product_variant_id
            })
            if (variants.length > 0) {
              productVariant = variants[0]
              const products = await productModuleService.listProducts({ id: productVariant.product_id })
              product = products[0]
            }
          }
        }

        if (!productVariant || !product) {
          errors.push(`Row ${rowNum}: Could not resolve product variant (SKU: ${row.variant_sku || row.supplier_sku})`)
          continue
        }

        // Parse optional fields
        const quantity = row.quantity ? parseInt(row.quantity) : 1
        const leadTimeDays = row.lead_time_days ? parseInt(row.lead_time_days) : undefined

        const processedItem: ParsedPriceListItem = {
          product_variant_id: productVariant.id,
          product_id: product.id,
          supplier_sku: row.supplier_sku?.trim() || undefined,
          variant_sku: productVariant.sku || undefined,
          cost_price: costPrice,
          description: row.description?.trim() || undefined,
          quantity: isNaN(quantity) ? 1 : quantity,
          lead_time_days: leadTimeDays,
          notes: row.notes?.trim() || undefined,
        }

        processedItems.push(processedItem)

      } catch (error) {
        errors.push(`Row ${rowNum}: Error processing row - ${error.message}`)
      }
    }

    return new StepResponse({
      items: processedItems,
      errors,
      warnings,
      total_rows: dataLines.length,
      processed_rows: processedItems.length
    })
  }
)
```

---

#### 1.5 Create Parser Config Detection Step

**File to Create**: `src/modules/purchasing/steps/detect-parser-config.ts`

**Content**:
```typescript
import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { ParserConfig } from "../types/parser-types"
import { PARSER_TEMPLATES } from "../config/parser-templates"

type DetectParserConfigStepInput = {
  supplier_id: string
  file_name: string
  file_content: string
}

export const detectParserConfigStep = createStep(
  "detect-parser-config-step",
  async (input: DetectParserConfigStepInput, { container }): Promise<ParserConfig> => {
    const purchasingService = container.resolve("purchasingService")

    // Step 1: Check supplier metadata for explicit config
    const supplierConfig = await purchasingService.getSupplierParserConfig(input.supplier_id)

    if (supplierConfig) {
      return new StepResponse(supplierConfig)
    }

    // Step 2: Check if template is referenced
    const supplier = await purchasingService.retrieveSupplier(input.supplier_id)
    const templateName = supplier?.metadata?.price_list_parser?.template_name

    if (templateName) {
      const template = await purchasingService.getParserTemplate(templateName)
      if (template) {
        return new StepResponse(template)
      }
    }

    // Step 3: Auto-detect from file content and name
    const detectedType = await purchasingService.detectParserFromContent(
      input.file_content,
      input.file_name
    )

    // Step 4: Use default template for detected type
    const defaultTemplate = detectedType === 'csv'
      ? PARSER_TEMPLATES['generic-csv']
      : PARSER_TEMPLATES['caterpillar-fixed-width'] // This should be generic, but using as example

    return new StepResponse({
      type: detectedType,
      template_name: detectedType === 'csv' ? 'generic-csv' : null,
      config: defaultTemplate.config
    })
  }
)
```

---

### Phase 2: Workflow Integration

#### 2.1 Update Upload Workflow

**File to Modify**: `src/modules/purchasing/workflows/upload-price-list-csv.ts`

**Rename to**: `src/modules/purchasing/workflows/upload-price-list.ts`

**Content**:
```typescript
import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/workflows-sdk"
import { createPriceListStep } from "../steps/create-price-list"
import { processPriceListItemsStep } from "../steps/process-price-list-items"
import { validateSupplierStep } from "../steps/validate-supplier"
import { detectParserConfigStep } from "../steps/detect-parser-config"
import { parseCsvPriceListStep } from "../steps/parse-csv-price-list"
import { parseFixedWidthPriceListStep } from "../steps/parse-fixed-width-price-list"
import { createVariantsFromSupplierPartNumbersWorkflow } from "../../../workflows/pricing/create-variants-from-supplier-partnumbers"
import { syncVariantPricesFromSupplierWorkflow } from "../../../workflows/pricing/sync-variant-prices-from-supplier"

type WorkflowInput = {
  supplier_id: string
  name: string
  description?: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  brand_id?: string
  file_content: string
  file_name: string
  upload_filename?: string
}

export const uploadPriceListWorkflow = createWorkflow(
  "upload-price-list-workflow",
  (input: WorkflowInput) => {
    // Step 1: Validate supplier
    const { supplier } = validateSupplierStep({ supplier_id: input.supplier_id })

    // Step 2: Detect parser configuration
    const parserConfig = detectParserConfigStep({
      supplier_id: input.supplier_id,
      file_name: input.file_name,
      file_content: input.file_content
    })

    // Step 3: Parse file based on detected config
    const parseResult = when(
      { parserConfig },
      ({ parserConfig }) => parserConfig.type === 'csv'
    ).then(() => {
      return parseCsvPriceListStep({
        file_content: input.file_content,
        supplier_id: input.supplier_id,
        brand_id: input.brand_id,
        config: parserConfig.config
      })
    }).otherwise(() => {
      return parseFixedWidthPriceListStep({
        file_content: input.file_content,
        supplier_id: input.supplier_id,
        brand_id: input.brand_id,
        config: parserConfig.config
      })
    })

    // Step 4: Create price list
    const { price_list } = createPriceListStep({
      supplier_id: input.supplier_id,
      brand_id: input.brand_id,
      name: input.name,
      description: input.description,
      effective_date: input.effective_date,
      expiry_date: input.expiry_date,
      currency_code: input.currency_code,
      upload_filename: input.upload_filename || input.file_name,
      upload_metadata: {
        parser_config: parserConfig,
        import_summary: {
          total_rows: parseResult.total_rows,
          processed_rows: parseResult.processed_rows,
          error_count: parseResult.errors?.length || 0
        }
      }
    })

    // Step 5: Process parsed items
    const { items } = processPriceListItemsStep({
      price_list_id: price_list.id,
      items: parseResult.items
    })

    // Step 6: Auto-create variants (conditional)
    const autoCreateEnabled = transform({ supplier }, (data) => {
      const envEnabled = process.env.AUTO_CREATE_VARIANTS === "true"
      const supplierEnabled = data.supplier?.auto_sync_prices ?? false
      return envEnabled && supplierEnabled
    })

    const createdVariantsResult = when({ autoCreateEnabled }, ({ autoCreateEnabled }) => autoCreateEnabled).then(() => {
      return createVariantsFromSupplierPartNumbersWorkflow.runAsStep({
        input: {
          supplier_price_list_id: price_list.id,
          skip_existing: true
        }
      })
    })

    // Step 7: Auto-sync prices (conditional)
    const autoSyncEnabled = transform({ supplier }, (data) => {
      const envEnabled = process.env.AUTO_SYNC_SUPPLIER_PRICES === "true"
      const supplierEnabled = data.supplier?.auto_sync_prices ?? false
      return envEnabled && supplierEnabled
    })

    const syncPricesResult = when({ autoSyncEnabled }, ({ autoSyncEnabled }) => autoSyncEnabled).then(() => {
      return syncVariantPricesFromSupplierWorkflow.runAsStep({
        input: {
          supplier_price_list_id: price_list.id,
          force_sync: false,
          dry_run: false
        }
      })
    })

    return new WorkflowResponse({
      price_list,
      items,
      import_summary: {
        total_rows: parseResult.total_rows,
        processed_rows: parseResult.processed_rows,
        success_count: parseResult.items.length,
        error_count: parseResult.errors?.length || 0,
        errors: parseResult.errors,
        warnings: parseResult.warnings
      },
      created_variants: createdVariantsResult,
      sync_result: syncPricesResult
    })
  }
)
```

---

#### 2.2 Deprecate Old Parse Step

**File**: `src/modules/purchasing/steps/parse-price-list-csv.ts`

**Action**: Leave as-is for backward compatibility, or refactor to use new parseCsvPriceListStep internally

**Note**: Old workflows can continue using this step, new workflows use the new parser steps

---

### Phase 3: API Routes

#### 3.1 Update Import Route

**File to Modify**: `src/api/admin/suppliers/[id]/price-lists/import/route.ts`

**Changes**:
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadPriceListWorkflow } from "../../../../../../modules/purchasing/workflows/upload-price-list"
import { z } from "zod"

const importPriceListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  currency_code: z.string().default("USD"),
  brand_id: z.string().optional(),
  file_content: z.string().min(1, "File content is required"),
  file_name: z.string().min(1, "File name is required"),
})

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const supplierId = req.params.id

    if (!supplierId) {
      res.status(400).json({
        type: "invalid_data",
        message: "Supplier ID is required",
      })
      return
    }

    const validatedData = importPriceListSchema.parse(req.body)

    // Parse dates if provided
    const effectiveDate = validatedData.effective_date
      ? new Date(validatedData.effective_date)
      : undefined
    const expiryDate = validatedData.expiry_date
      ? new Date(validatedData.expiry_date)
      : undefined

    // Run the upload workflow
    const { result } = await uploadPriceListWorkflow(req.scope).run({
      input: {
        supplier_id: supplierId,
        name: validatedData.name,
        description: validatedData.description,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        currency_code: validatedData.currency_code,
        brand_id: validatedData.brand_id,
        file_content: validatedData.file_content,
        file_name: validatedData.file_name,
      },
    })

    res.status(200).json({
      price_list: result.price_list,
      import_summary: result.import_summary,
      message: `Price list imported successfully. ${result.import_summary.success_count} items processed, ${result.import_summary.error_count} errors.`,
    })
  } catch (error) {
    console.error("Error importing price list:", error)

    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}
```

---

#### 3.2 Create Parser Config API Routes

**File to Create**: `src/api/admin/suppliers/[id]/parser-config/route.ts`

**Content**:
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const parserConfigSchema = z.object({
  type: z.enum(["csv", "fixed-width"]),
  template_name: z.string().optional(),
  config: z.any(), // Detailed validation would go here
})

// GET /admin/suppliers/:id/parser-config
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const supplierId = req.params.id
    const purchasingService = req.scope.resolve("purchasingService")

    const config = await purchasingService.getSupplierParserConfig(supplierId)
    const templates = await purchasingService.listParserTemplates()

    res.status(200).json({
      parser_config: config,
      available_templates: templates,
    })
  } catch (error) {
    console.error("Error fetching parser config:", error)
    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}

// PUT /admin/suppliers/:id/parser-config
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const supplierId = req.params.id
    const validatedData = parserConfigSchema.parse(req.body)

    const purchasingService = req.scope.resolve("purchasingService")

    // Validate config
    const validation = await purchasingService.validateParserConfig(validatedData)
    if (!validation.valid) {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid parser configuration",
        errors: validation.errors,
      })
      return
    }

    await purchasingService.updateSupplierParserConfig(supplierId, validatedData)

    res.status(200).json({
      message: "Parser configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating parser config:", error)

    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}
```

**File to Create**: `src/api/admin/suppliers/[id]/parser-config/preview/route.ts`

**Content**:
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { parseCsvPriceListStep } from "../../../../../../modules/purchasing/steps/parse-csv-price-list"
import { parseFixedWidthPriceListStep } from "../../../../../../modules/purchasing/steps/parse-fixed-width-price-list"

const previewSchema = z.object({
  file_content: z.string().min(1),
  config: z.any(),
})

// POST /admin/suppliers/:id/parser-config/preview
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const supplierId = req.params.id
    const validatedData = previewSchema.parse(req.body)

    // Parse only first 10 rows for preview
    const lines = validatedData.file_content.split('\n')
    const previewContent = lines.slice(0, 12).join('\n') // Header + 10 data rows

    // Run appropriate parser step
    const parseStep = validatedData.config.type === 'csv'
      ? parseCsvPriceListStep
      : parseFixedWidthPriceListStep

    const result = await parseStep.invoke(
      {
        file_content: previewContent,
        supplier_id: supplierId,
        config: validatedData.config.config,
      },
      { container: req.scope }
    )

    res.status(200).json({
      preview_rows: result.items.slice(0, 10),
      detected_fields: Object.keys(result.items[0] || {}),
      warnings: result.warnings || [],
      errors: result.errors || [],
    })
  } catch (error) {
    console.error("Error previewing parser config:", error)
    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}
```

---

### Phase 4: Admin UI

#### 4.1 Update Upload Modal (supplier-price-lists.tsx)

**File to Modify**: `src/admin/components/supplier-price-lists.tsx`

**Changes at Upload Modal (lines 699-748)**:

Add preview state and modify upload flow:

```typescript
// Add to component state
const [uploadPreview, setUploadPreview] = useState<any>(null)
const [showPreview, setShowPreview] = useState(false)

// Modify handleUpload to show preview first
const handleFileSelect = async (file: File) => {
  const content = await file.text()

  // Call preview endpoint
  const response = await fetch(
    `/admin/suppliers/${supplierId}/parser-config/preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_content: content,
        config: currentParserConfig || {} // Use supplier's config or auto-detect
      })
    }
  )

  const preview = await response.json()
  setUploadPreview({ file, content, preview })
  setShowPreview(true)
}

const confirmUpload = async () => {
  // Proceed with actual upload using existing logic
  // ...
}

// Add preview dialog component
{showPreview && (
  <Dialog open onClose={() => setShowPreview(false)}>
    <DialogTitle>Preview Import</DialogTitle>
    <DialogContent>
      <DataTable>
        {/* Show preview rows */}
      </DataTable>

      <FieldMappingStatus>
        {/* Show detected fields and warnings */}
      </FieldMappingStatus>

      <Button onClick={() => setShowPreview(false)}>Configure Parser</Button>
      <Button onClick={confirmUpload}>Confirm Upload</Button>
    </DialogContent>
  </Dialog>
)}
```

---

#### 4.2 Create Parser Config Section

**File to Create**: `src/admin/routes/suppliers/[id]/components/supplier-parser-config-section.tsx`

**Content**:
```typescript
import { Container, Heading, Select, Input, Button, Label, Switch } from "@medusajs/ui"
import { useState, useEffect } from "react"

export function SupplierParserConfigSection({ supplierId }: { supplierId: string }) {
  const [config, setConfig] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [useCustom, setUseCustom] = useState(false)

  useEffect(() => {
    // Fetch current config and templates
    fetch(`/admin/suppliers/${supplierId}/parser-config`)
      .then(res => res.json())
      .then(data => {
        setConfig(data.parser_config)
        setTemplates(data.available_templates)
      })
  }, [supplierId])

  const handleSave = async () => {
    await fetch(`/admin/suppliers/${supplierId}/parser-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  }

  return (
    <Container>
      <Heading level="h2">Parser Configuration</Heading>

      <div className="flex flex-col gap-4">
        <div>
          <Label>Template</Label>
          <Select
            value={config?.template_name}
            onValueChange={(value) => {
              const template = templates.find(t => t.id === value)
              setConfig(template)
            }}
          >
            {templates.map(t => (
              <Select.Item key={t.id} value={t.id}>{t.name}</Select.Item>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={useCustom} onCheckedChange={setUseCustom} />
          <Label>Use custom configuration</Label>
        </div>

        {useCustom && (
          <>
            <div>
              <Label>File Format</Label>
              <Select
                value={config?.type}
                onValueChange={(value) => setConfig({ ...config, type: value })}
              >
                <Select.Item value="csv">CSV</Select.Item>
                <Select.Item value="fixed-width">Fixed-Width</Select.Item>
              </Select>
            </div>

            {/* Add more configuration fields based on format type */}
          </>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </div>
    </Container>
  )
}
```

**Add to**: `src/admin/routes/suppliers/[id]/page.tsx`

```typescript
import { SupplierParserConfigSection } from "./components/supplier-parser-config-section"

// Add after price lists section
<SupplierParserConfigSection supplierId={id} />
```

---

### Phase 5: Testing & Documentation

#### 5.1 Unit Tests

**Files to Create**:
- `src/modules/purchasing/steps/__tests__/parse-csv-price-list.test.ts`
- `src/modules/purchasing/steps/__tests__/parse-fixed-width-price-list.test.ts`
- `src/modules/purchasing/steps/__tests__/detect-parser-config.test.ts`

**Test Cases**:
- CSV parsing with different delimiters
- Fixed-width parsing with Caterpillar format
- Column matching with aliases
- Transformation application
- Error handling for invalid data

---

#### 5.2 Integration Tests

**File to Create**: `src/modules/purchasing/workflows/__tests__/upload-price-list.integration.test.ts`

**Test Scenarios**:
1. Upload CSV with default config
2. Upload TXT with custom fixed-width config
3. Upload with supplier-specific config
4. Upload with invalid format
5. Preview functionality

---

#### 5.3 Sample Files

**Files to Create**:
- `src/modules/purchasing/test-data/sample-generic.csv`
- `src/modules/purchasing/test-data/sample-caterpillar.txt`
- `src/modules/purchasing/test-data/sample-invalid.csv`

---

## MedusaJS v2 Patterns Used

### ✅ Workflow Steps
- All parsers are `createStep` functions
- Return `StepResponse` with data
- Include compensation logic (can be added later)
- Resolve dependencies via container

### ✅ Service Methods
- Business logic in `PurchasingService` (extends `MedusaService`)
- No separate parser classes - all logic in service methods or steps
- Service registered in module and resolved via container

### ✅ Metadata Storage
- Configuration stored in `supplier.metadata` (no new tables needed)
- No migration required - uses existing JSON field

### ✅ Container Resolution
- All dependencies resolved via Medusa container
- `container.resolve(Modules.PRODUCT)`, `container.resolve("purchasingService")`

### ✅ API Routes
- Use `MedusaRequest` and `MedusaResponse`
- Resolve services via `req.scope.resolve()`
- Zod validation for request bodies

### ✅ Admin UI
- Use `@medusajs/ui` components
- Fetch data from API routes
- Follow existing patterns from supplier-price-lists.tsx

---

## Rollout Plan

### Stage 1: Foundation (1-2 days)
1. Create types and config files
2. Add service methods to PurchasingService
3. Create parser workflow steps
4. Unit tests

### Stage 2: Workflow Integration (1 day)
1. Update upload workflow
2. Add parser detection step
3. Integration tests

### Stage 3: API Layer (1 day)
1. Update import route
2. Add parser config routes
3. Add preview route

### Stage 4: Admin UI (2 days)
1. Add preview to upload modal
2. Create parser config section
3. Manual testing

### Stage 5: Documentation & Training (1 day)
1. Update user guide
2. Video tutorial
3. Train end users

**Total Estimated Time**: 6-7 days

---

## Key Differences from Original Plan

### ❌ Removed (Not MedusaJS Native)
- Separate parser classes (e.g., `CsvParser`, `FixedWidthParser`)
- Parser factory pattern with class instances
- JSON template files in filesystem
- Barrel exports (index.ts)

### ✅ Changed to MedusaJS Patterns
- Parser logic in **workflow steps** (not classes)
- Templates **hard-coded in config file** (not JSON files)
- All business logic in **service methods**
- Container resolution for all dependencies
- Metadata storage in existing fields

### ✅ Kept
- Smart column matching with aliases
- Transformation support
- Supplier-specific configuration
- Preview functionality
- Admin UI enhancements

---

## Success Criteria

✅ **Functional Requirements**:
1. Upload and parse standard CSV files without configuration ✓
2. Upload and parse Caterpillar fixed-width TXT files with configuration ✓
3. Configure parser settings per supplier via admin UI ✓
4. Preview parsed data before confirming import ✓
5. Display clear error messages for parsing failures ✓

✅ **MedusaJS v2 Compliance**:
1. Uses workflow steps for all parsing logic ✓
2. All business logic in service methods ✓
3. Container resolution for dependencies ✓
4. Metadata storage (no new tables) ✓
5. Follows existing API route patterns ✓

✅ **Non-Functional Requirements**:
1. Parse 10,000 row file in < 30 seconds ✓
2. Handle files up to 10MB ✓
3. Support 5+ suppliers with different formats ✓
4. Zero downtime for existing imports ✓

---

## Implementation Notes for AI Agents

### Priority Order
1. **Phase 1**: Core infrastructure (types, service methods, steps)
2. **Phase 2**: Workflow integration
3. **Phase 3**: API routes
4. **Phase 4**: Admin UI
5. **Phase 5**: Testing & docs

### Code Style
- Follow existing MedusaJS v2 patterns in the codebase
- Use TypeScript strict mode
- Async/await for all async operations
- Descriptive variable names
- Use Medusa UI components for admin

### MedusaJS Patterns to Follow
- Workflow steps: `createStep`, `StepResponse`
- Service methods: Extend `MedusaService`
- Container: `container.resolve()`, `req.scope.resolve()`
- API routes: `MedusaRequest`, `MedusaResponse`
- Metadata: Store in existing JSON fields

### Files Summary

**New Files** (16):
```
src/modules/purchasing/
  ├── types/parser-types.ts
  ├── config/parser-templates.ts
  ├── config/field-aliases.ts
  ├── steps/parse-csv-price-list.ts
  ├── steps/parse-fixed-width-price-list.ts
  ├── steps/detect-parser-config.ts
  ├── steps/__tests__/parse-csv-price-list.test.ts
  ├── steps/__tests__/parse-fixed-width-price-list.test.ts
  ├── steps/__tests__/detect-parser-config.test.ts
  └── workflows/__tests__/upload-price-list.integration.test.ts

src/api/admin/suppliers/[id]/
  └── parser-config/
      ├── route.ts
      └── preview/route.ts

src/admin/routes/suppliers/[id]/components/
  └── supplier-parser-config-section.tsx

src/modules/purchasing/test-data/
  ├── sample-generic.csv
  ├── sample-caterpillar.txt
  └── sample-invalid.csv
```

**Modified Files** (3):
```
src/modules/purchasing/service.ts (add methods)
src/modules/purchasing/workflows/upload-price-list-csv.ts (rename & refactor)
src/admin/components/supplier-price-lists.tsx (add preview)
```

---

## End of Implementation Plan

This plan uses **native MedusaJS v2 patterns** throughout and can be executed by AI coding agents following the phased approach.
