import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type ParsePriceListCsvStepInput = {
  csv_content: string
  supplier_id: string
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
    
    const csvRows = parseCSV(input.csv_content)
    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []
    
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
          const variants = await productModuleService.listProductVariants(
            { sku: row.variant_sku },
            { select: ["id", "product_id", "sku"], relations: ["product"] }
          )
          
          if (variants.length === 0) {
            errors.push(`Row ${rowNum}: Product variant with SKU "${row.variant_sku}" not found`)
            continue
          }
          
          productVariant = variants[0]
          product = productVariant.product
        } else if (row.product_id) {
          // Find by product ID
          const products = await productModuleService.listProducts(
            { id: row.product_id },
            { select: ["id"], relations: ["variants"] }
          )
          
          if (products.length === 0) {
            errors.push(`Row ${rowNum}: Product with ID "${row.product_id}" not found`)
            continue
          }
          
          product = products[0]
          // Use first variant if no specific variant specified
          if (product.variants && product.variants.length > 0) {
            productVariant = product.variants[0]
          } else {
            errors.push(`Row ${rowNum}: Product "${row.product_id}" has no variants`)
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