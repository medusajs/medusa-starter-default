import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type ParsePriceListCsvStepInput = {
  csv_content: string
  supplier_id: string
  brand_id?: string
}

type ParsedPriceListItem = {
  product_variant_id: string
  product_id: string
  supplier_sku?: string
  variant_sku?: string
  cost_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
}

// Simple CSV parser for comma-separated values with proper quote handling
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export const parsePriceListCsvStep = createStep(
  "parse-price-list-csv-step",
  async (input: ParsePriceListCsvStepInput, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const remoteQuery = container.resolve("REMOTE_QUERY") as any
    const featureFlag = process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING === "true"
    
    const csvRows = parseCSV(input.csv_content)
    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []

    // Determine allowed brand ids for the supplier if feature enabled
    let allowedBrandIds: string[] | null = null
    if (featureFlag) {
      try {
        const supplierWithBrands = await remoteQuery(
          {
            entryPoint: "supplier",
            fields: ["id", "brands.id", "brands.code"],
            variables: { filters: { id: input.supplier_id } },
          },
          {}
        )
        const supplier = Array.isArray(supplierWithBrands) ? supplierWithBrands[0] : supplierWithBrands
        const supplierBrandIds: string[] = (supplier?.brands || []).map((b: any) => b.id)
        if (input.brand_id) {
          // Intersect with provided brand scope
          allowedBrandIds = supplierBrandIds.includes(input.brand_id) ? [input.brand_id] : []
        } else {
          allowedBrandIds = supplierBrandIds
        }
      } catch (e: any) {
        errors.push(`Failed to load supplier brands: ${e.message || e}`)
        // If we cannot determine allowed brands, bail early if brand scoping was requested
        if (input.brand_id) {
          return new StepResponse({ items: [], errors, total_rows: csvRows.length, processed_rows: 0 })
        }
      }
    }
    
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      const rowNum = i + 2 // +2 because we start at row 1 and skip header
      
      try {
        // Required fields validation
        if (!row.variant_sku && !row.product_id) {
          errors.push(`Row ${rowNum}: Either variant_sku or product_id is required`)
          continue
        }
        
        if (!row.cost_price) {
          errors.push(`Row ${rowNum}: cost_price is required`)
          continue
        }
        
        // Parse cost price
        const costPrice = parseFloat(row.cost_price)
        if (isNaN(costPrice)) {
          errors.push(`Row ${rowNum}: Invalid cost_price value`)
          continue
        }
        
        // Find product variant
        let productVariant = null
        let product = null
        
        if (row.variant_sku) {
          // Find by variant SKU
          const variantFilters: any = { sku: row.variant_sku }
          const variantConfig: any = { select: ["id", "product_id", "sku"], relations: ["product"] }
          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            variantFilters["brand.id"] = allowedBrandIds
            variantConfig.relations = ["product", "brand"]
          }
          const variants = await productModuleService.listProductVariants(
            variantFilters,
            variantConfig
          )
          
          if (variants.length === 0) {
            const brandMsg = featureFlag ? " for supplier’s allowed brands" : ""
            errors.push(`Row ${rowNum}: Product variant with SKU "${row.variant_sku}" not found${brandMsg}`)
            continue
          }
          
          if (featureFlag && allowedBrandIds) {
            if (variants.length > 1) {
              errors.push(`Row ${rowNum}: Variant SKU "${row.variant_sku}" is ambiguous across allowed brands`)
              continue
            }
          }
          productVariant = variants[0]
          product = productVariant.product
        } else if (row.product_id) {
          // Find by product ID
          const productFilters: any = { id: row.product_id }
          const productConfig: any = { select: ["id"], relations: ["variants"] }
          if (featureFlag && allowedBrandIds && allowedBrandIds.length > 0) {
            productConfig.relations = ["variants", "variants.brand"]
          }
          const products = await productModuleService.listProducts(
            productFilters,
            productConfig
          )
          
          if (products.length === 0) {
            errors.push(`Row ${rowNum}: Product with ID "${row.product_id}" not found`)
            continue
          }
          
          product = products[0]
          // Use first variant if no specific variant specified
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
            errors.push(`Row ${rowNum}: Product "${row.product_id}" has no variants${featureFlag ? " within allowed brands" : ""}`)
            continue
          }
        }
        
        if (!productVariant || !product) {
          errors.push(`Row ${rowNum}: Could not resolve product variant`)
          continue
        }
        
        // Parse optional fields
        const quantity = row.quantity ? parseInt(row.quantity) : 1
        const leadTimeDays = row.lead_time_days ? parseInt(row.lead_time_days) : undefined
        
        const processedItem: ParsedPriceListItem = {
          product_variant_id: productVariant.id,
          product_id: product.id,
          supplier_sku: row.supplier_sku || undefined,
          variant_sku: productVariant.sku || undefined,
          cost_price: costPrice,
          quantity: isNaN(quantity) ? 1 : quantity,
          lead_time_days: leadTimeDays,
          notes: row.notes || undefined,
        }
        
        processedItems.push(processedItem)
        
      } catch (error) {
        errors.push(`Row ${rowNum}: Error processing row - ${error.message}`)
      }
    }
    
    return new StepResponse({
      items: processedItems,
      errors,
      total_rows: csvRows.length,
      processed_rows: processedItems.length
    })
  }
)