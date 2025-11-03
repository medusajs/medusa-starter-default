/**
 * Fixed-Width Parser Workflow Step
 *
 * Handles fixed-width text file parsing for formats like Caterpillar,
 * extracting fields from specific column positions with data transformations.
 *
 * @see TEM-157 - Create Fixed-Width Parser Workflow Step
 */

import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FixedWidthConfig, ParsedPriceListItem, ParseResult, Transformation } from "../types/parser-types"
import { PURCHASING_MODULE } from ".."

type FixedWidthConfigWithMapping = {
  columns: Array<{
    name: string
    start: number
    width: number
  }>
  skip_rows: number
  column_mapping: Record<string, string>
  transformations?: Record<string, Transformation>
}

type ParseFixedWidthPriceListStepInput = {
  file_content: string
  supplier_id: string
  brand_id?: string
  config: FixedWidthConfigWithMapping
}

/**
 * Extract fields from fixed-width line based on column definitions
 */
function extractFixedWidthFields(
  line: string,
  columns: Array<{ name: string, start: number, width: number }>
): Record<string, string> {
  const row: Record<string, string> = {}

  for (const column of columns) {
    const end = column.start + column.width
    const value = line.substring(column.start, end).trim()
    row[column.name] = value
  }

  return row
}

/**
 * Apply transformation to a value
 */
function applyTransformation(value: any, transformation: Transformation): any {
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
    case 'substring':
      const str = String(value)
      return transformation.length 
        ? str.substring(transformation.start, transformation.start + transformation.length)
        : str.substring(transformation.start)
    case 'date':
      // Parse date from input format (e.g., YYYYMMDD) to ISO format (YYYY-MM-DD)
      const dateStr = String(value).trim()
      if (!dateStr || dateStr.length < 8) return value
      
      if (transformation.input_format === 'YYYYMMDD') {
        const year = dateStr.substring(0, 4)
        const month = dateStr.substring(4, 6)
        const day = dateStr.substring(6, 8)
        return `${year}-${month}-${day}`
      }
      return value
    default:
      return value
  }
}

/**
 * Fixed-width parser workflow step
 */
export const parseFixedWidthPriceListStep = createStep(
  "parse-fixed-width-price-list-step",
  async (input: ParseFixedWidthPriceListStepInput, { container }): Promise<ParseResult> => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const purchasingService = container.resolve(PURCHASING_MODULE)
    const featureFlag = process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING === "true"

    const { config, file_content, supplier_id, brand_id } = input

    const lines = file_content.split('\n').filter(line => line.trim())

    // Skip rows if configured
    const startIndex = config.skip_rows || 0
    const dataLines = lines.slice(startIndex)

    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []
    const warnings: string[] = []

    if (dataLines.length === 0) {
      return new StepResponse({
        items: [],
        errors: ['No data rows found in file after skipping rows'],
        warnings: [],
        total_rows: 0,
        processed_rows: 0
      })
    }

    // Validate column definitions
    const maxPosition = Math.max(...config.columns.map(col => col.start + col.width))

    // Invert the column mapping: target field → parsed column
    const fieldToColumnMapping: Record<string, string> = {}
    for (const [parsedColumn, targetField] of Object.entries(config.column_mapping)) {
      if (targetField && targetField.trim() !== '') {
        fieldToColumnMapping[targetField] = parsedColumn
      }
    }

    // Determine allowed brand ids for the supplier if feature enabled
    let allowedBrandIds: string[] | null = null
    if (featureFlag) {
      try {
        const { data: supplierWithBrands } = await query.graph({
          entity: "supplier",
          fields: ["id", "brands.id"],
          filters: { id: supplier_id },
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
        // Check if line is long enough
        if (line.length < maxPosition) {
          warnings.push(`Row ${rowNum}: Line shorter than expected (${line.length} < ${maxPosition}), some fields may be empty`)
        }

        // Extract fields based on fixed-width columns (gets parsed column values)
        const parsedRow = extractFixedWidthFields(line, config.columns)

        // Map parsed columns to target fields using column_mapping
        const mappedRow: any = {}
        for (const [targetField, parsedColumn] of Object.entries(fieldToColumnMapping)) {
          if (parsedRow[parsedColumn] !== undefined) {
            mappedRow[targetField] = parsedRow[parsedColumn]
          }
        }

        // Apply transformations
        if (config.transformations) {
          for (const [field, transformation] of Object.entries(config.transformations)) {
            if (mappedRow[field] !== undefined && mappedRow[field] !== '') {
              mappedRow[field] = applyTransformation(mappedRow[field], transformation)
            }
          }
        }

        // Validate required fields
        const hasIdentifier = (mappedRow.variant_sku && mappedRow.variant_sku.trim()) ||
                             (mappedRow.product_id && mappedRow.product_id.trim())

        if (!hasIdentifier) {
          errors.push(`Row ${rowNum}: Either variant_sku or product_id is required`)
          continue
        }

        // Parse pricing fields
        const grossPrice = mappedRow.gross_price ? parseFloat(mappedRow.gross_price) : undefined
        const discountPercentage = mappedRow.discount_percentage ? parseFloat(mappedRow.discount_percentage) : undefined

        // Support both net_price (new) and cost_price (legacy) for backward compatibility
        const netPrice = mappedRow.net_price || mappedRow.cost_price
        if (!netPrice && netPrice !== '0') {
          errors.push(`Row ${rowNum}: net_price or cost_price is required`)
          continue
        }

        const parsedNetPrice = parseFloat(String(netPrice))
        if (isNaN(parsedNetPrice)) {
          errors.push(`Row ${rowNum}: Invalid net_price value: "${netPrice}"`)
          continue
        }

        // Find product variant
        let productVariant = null
        let product = null

        // Try by variant_sku first
        if (mappedRow.variant_sku && mappedRow.variant_sku.trim()) {
          const variantFilters: any = { sku: mappedRow.variant_sku.trim() }
          const variantConfig: any = { select: ["id", "product_id", "sku"], relations: ["product"] }

          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            variantFilters["brand.id"] = allowedBrandIds
            variantConfig.relations = ["product", "brand"]
          }

          const variants = await productModuleService.listProductVariants(variantFilters, variantConfig)

          if (variants.length > 0) {
            productVariant = variants[0]
            product = productVariant.product
          } else {
            const brandMsg = featureFlag ? " for supplier's allowed brands" : ""
            errors.push(`Row ${rowNum}: Product variant with SKU "${mappedRow.variant_sku.trim()}" not found${brandMsg}`)
            continue
          }
        }

        // Try by product_id if still not found
        if (!productVariant && mappedRow.product_id && mappedRow.product_id.trim()) {
          const productFilters: any = { id: mappedRow.product_id.trim() }
          const productConfig: any = { select: ["id"], relations: ["variants"] }

          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            productConfig.relations = ["variants", "variants.brand"]
          }

          const products = await productModuleService.listProducts(productFilters, productConfig)

          if (products.length === 0) {
            errors.push(`Row ${rowNum}: Product with ID "${mappedRow.product_id.trim()}" not found`)
            continue
          }

          product = products[0]
          const candidateVariants = (product.variants || [])
          const filteredByBrand = featureFlag && allowedBrandIds && allowedBrandIds.length > 0
            ? candidateVariants.filter((v: any) => v?.brand?.id && allowedBrandIds!.includes(v.brand.id))
            : candidateVariants

          if (filteredByBrand.length > 1 && featureFlag) {
            errors.push(`Row ${rowNum}: Multiple variants found for product within allowed brands—SKU required`)
            continue
          }

          if (filteredByBrand.length > 0) {
            productVariant = filteredByBrand[0]
          } else {
            errors.push(`Row ${rowNum}: Product "${mappedRow.product_id.trim()}" has no variants${featureFlag ? " within allowed brands" : ""}`)
            continue
          }
        }

        if (!productVariant || !product) {
          const identifier = mappedRow.variant_sku?.trim() || mappedRow.product_id?.trim()
          errors.push(`Row ${rowNum}: Could not resolve product variant (identifier: ${identifier})`)
          continue
        }

        // Parse optional fields
        const quantity = mappedRow.quantity ? parseInt(String(mappedRow.quantity)) : 1

        // Collect unmapped fields into metadata
        // Standard fields that are directly mapped to ParsedPriceListItem properties
        const standardFields = new Set([
          'product_variant_id', 'product_id', 'variant_sku',
          'gross_price', 'discount_code', 'discount_percentage', 'net_price',
          'description', 'category', 'quantity', 'notes',
          'cost_price' // Legacy field alias
        ])
        
        const metadata: Record<string, any> = {}
        for (const [field, value] of Object.entries(mappedRow)) {
          if (!standardFields.has(field) && value !== undefined && value !== '') {
            metadata[field] = value
          }
        }

        // Create processed item
        const processedItem: ParsedPriceListItem = {
          product_variant_id: productVariant.id,
          product_id: product.id,
          variant_sku: productVariant.sku || undefined,

          // Pricing fields
          gross_price: isNaN(grossPrice!) ? undefined : grossPrice,
          discount_code: mappedRow.discount_code?.trim() || undefined,
          discount_percentage: isNaN(discountPercentage!) ? undefined : discountPercentage,
          net_price: parsedNetPrice,

          // Product information fields
          description: mappedRow.description?.trim() || undefined,
          category: mappedRow.category?.trim() || undefined,

          // Other fields
          quantity: isNaN(quantity) ? 1 : quantity,
          notes: mappedRow.notes?.trim() || undefined,
          
          // Metadata for additional supplier-specific fields
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }

        processedItems.push(processedItem)

      } catch (error: any) {
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
  },
  // Compensation logic - nothing to rollback for parsing step
  // The actual data creation happens in subsequent steps
  async () => {
    return new StepResponse(void 0, {})
  }
)
