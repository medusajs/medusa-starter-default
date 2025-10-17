/**
 * Flexible CSV Parser Workflow Step
 *
 * Handles CSV parsing with configurable delimiters, column mapping,
 * and data transformations. Supports both explicit and auto-detected
 * column mapping.
 *
 * @see TEM-156 - Create CSV Parser Workflow Step
 */

import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CsvConfig, ParsedPriceListItem, ParseResult, Transformation } from "../types/parser-types"
import { FIELD_ALIASES } from "../config/field-aliases"

type ParseCsvPriceListStepInput = {
  file_content: string
  supplier_id: string
  brand_id?: string
  config: CsvConfig
}

/**
 * Parse CSV content with configurable delimiter
 */
function parseCSV(csvContent: string, delimiter: string = ',', quoteChar: string = '"'): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0], delimiter, quoteChar)
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter, quoteChar)
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string, quoteChar: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === quoteChar) {
      if (inQuotes && line[i + 1] === quoteChar) {
        current += quoteChar
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
    default:
      return value
  }
}

/**
 * Flexible CSV parser workflow step
 */
export const parseCsvPriceListStep = createStep(
  "parse-csv-price-list-flexible-step",
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

    // Parse CSV with configured delimiter and quote character
    const csvRows = parseCSV(contentToProcess, config.delimiter, config.quote_char)
    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []
    const warnings: string[] = []

    if (csvRows.length === 0) {
      return new StepResponse({
        items: [],
        errors: ['No data rows found in CSV file'],
        warnings: [],
        total_rows: 0,
        processed_rows: 0
      })
    }

    // Auto-match columns if mapping uses arrays (aliases)
    let columnMapping = config.column_mapping
    const headers = Object.keys(csvRows[0])

    // Get auto-detected mapping
    const autoMapping = await purchasingService.matchColumnsToFields(headers, FIELD_ALIASES)

    // Build final mapping: prefer explicit config, fallback to auto-detection
    const finalMapping: Record<string, string> = {}
    for (const [field, columnOrAliases] of Object.entries(columnMapping)) {
      if (typeof columnOrAliases === 'string') {
        // Explicit column name provided
        finalMapping[field] = columnOrAliases
      } else if (Array.isArray(columnOrAliases)) {
        // Array of aliases - try to find match in headers
        for (const alias of columnOrAliases) {
          const normalizedAlias = alias.toLowerCase().trim()
          const match = headers.find(h => h.toLowerCase().trim() === normalizedAlias)
          if (match) {
            finalMapping[field] = match
            break
          }
        }
        // If no match found in explicit aliases, use auto-detection
        if (!finalMapping[field] && autoMapping[field]) {
          finalMapping[field] = autoMapping[field]
        }
      }
    }

    // Also add auto-detected mappings that weren't explicitly configured
    for (const [field, header] of Object.entries(autoMapping)) {
      if (!finalMapping[field]) {
        finalMapping[field] = header
      }
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
        // Map columns using final column mapping
        const mappedRow: any = {}
        for (const [field, columnName] of Object.entries(finalMapping)) {
          if (row[columnName] !== undefined) {
            mappedRow[field] = row[columnName]
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
        if (!mappedRow.variant_sku && !mappedRow.supplier_sku && !mappedRow.product_id) {
          errors.push(`Row ${rowNum}: Either variant_sku, supplier_sku, or product_id is required`)
          continue
        }

        if (!mappedRow.cost_price && mappedRow.cost_price !== 0) {
          errors.push(`Row ${rowNum}: cost_price is required`)
          continue
        }

        // Parse cost price
        const costPrice = parseFloat(String(mappedRow.cost_price))
        if (isNaN(costPrice)) {
          errors.push(`Row ${rowNum}: Invalid cost_price value: "${mappedRow.cost_price}"`)
          continue
        }

        // Find product variant
        let productVariant = null
        let product = null

        // Try by variant_sku first
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
              warnings.push(`Row ${rowNum}: Variant SKU "${mappedRow.variant_sku}" not found, will try supplier_sku`)
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
            }, { select: ["id", "product_id", "sku"], relations: ["product"] })

            if (variants.length > 0) {
              productVariant = variants[0]
              product = productVariant.product
            }
          } else if (!mappedRow.variant_sku && !mappedRow.product_id) {
            // Only error if we haven't tried other methods
            errors.push(`Row ${rowNum}: Supplier SKU "${mappedRow.supplier_sku}" not found in supplier products`)
            continue
          }
        }

        // If still not found and product_id provided
        if (!productVariant && mappedRow.product_id) {
          const productFilters: any = { id: mappedRow.product_id }
          const productConfig: any = { select: ["id"], relations: ["variants"] }

          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            productConfig.relations = ["variants", "variants.brand"]
          }

          const products = await productModuleService.listProducts(productFilters, productConfig)

          if (products.length === 0) {
            errors.push(`Row ${rowNum}: Product with ID "${mappedRow.product_id}" not found`)
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
            errors.push(`Row ${rowNum}: Product "${mappedRow.product_id}" has no variants${featureFlag ? " within allowed brands" : ""}`)
            continue
          }
        }

        if (!productVariant || !product) {
          errors.push(`Row ${rowNum}: Could not resolve product variant`)
          continue
        }

        // Parse optional fields
        const quantity = mappedRow.quantity ? parseInt(String(mappedRow.quantity)) : 1
        const leadTimeDays = mappedRow.lead_time_days ? parseInt(String(mappedRow.lead_time_days)) : undefined

        const processedItem: ParsedPriceListItem = {
          product_variant_id: productVariant.id,
          product_id: product.id,
          supplier_sku: mappedRow.supplier_sku || undefined,
          variant_sku: productVariant.sku || undefined,
          cost_price: costPrice,
          description: mappedRow.description || undefined,
          quantity: isNaN(quantity) ? 1 : quantity,
          lead_time_days: isNaN(leadTimeDays!) ? undefined : leadTimeDays,
          notes: mappedRow.notes || undefined,
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
      total_rows: csvRows.length,
      processed_rows: processedItems.length
    })
  },
  // Compensation logic - nothing to rollback for parsing step
  // The actual data creation happens in subsequent steps
  async () => {
    return new StepResponse(void 0, {})
  }
)
