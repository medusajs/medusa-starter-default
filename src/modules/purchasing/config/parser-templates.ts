/**
 * Parser Templates Configuration
 *
 * Pre-configured parser templates for common supplier file formats.
 * These templates provide sensible defaults and can be used as-is or
 * customized per supplier.
 *
 * @see TEM-154 - Create Parser Types and Configuration Schemas
 */

import { ParserTemplate } from "../types/parser-types"

/**
 * Pre-configured parser templates
 */
export const PARSER_TEMPLATES: Record<string, ParserTemplate> = {
  "generic-csv": {
    id: "generic-csv",
    name: "Generic CSV",
    type: "csv",
    config: {
      delimiter: ",",
      quote_char: "\"",
      has_header: true,
      skip_rows: 0,
      column_mapping: {
        supplier_sku: ["supplier_sku", "sku", "part_number", "onderdeelnummer"],
        net_price: ["net_price", "cost_price", "price", "lijstprijs"],
        variant_sku: ["variant_sku", "internal_sku", "our_sku"],
        description: ["description", "desc", "name", "omschrijving"],
        category: ["category", "product_category", "cat", "categorie"],
        quantity: ["quantity", "qty", "amount"],
        lead_time_days: ["lead_time", "lead_time_days", "delivery_time"],
        notes: ["notes", "comment", "remarks"]
      }
    }
  },
  // TEM-173: CSV template with gross price and discount structure
  "standard-csv-with-discounts": {
    id: "standard-csv-with-discounts",
    name: "Standard CSV with Gross/Discount/Net",
    type: "csv",
    config: {
      delimiter: ",",
      quote_char: "\"",
      has_header: true,
      skip_rows: 0,
      column_mapping: {
        variant_sku: ["variant_sku", "sku"],
        gross_price: ["gross_price", "list_price"],
        discount_code: ["discount_code", "disc_code"],
        discount_percentage: ["discount_%", "disc_pct"],
        net_price: ["net_price", "cost_price"],
        description: ["description", "product_desc"],
        category: ["category", "product_category"],
        quantity: ["quantity", "qty"]
      }
    }
  },
  // TEM-173: Updated Caterpillar fixed-width template with discount fields
  "caterpillar-fixed-width": {
    id: "caterpillar-fixed-width",
    name: "Caterpillar Fixed Width",
    type: "fixed-width",
    config: {
      skip_rows: 1,
      fixed_width_columns: [
        { field: "supplier_sku", start: 0, width: 18 },
        { field: "description", start: 18, width: 40 },
        { field: "category", start: 58, width: 11 },
        { field: "gross_price", start: 69, width: 13 },
        { field: "net_price", start: 82, width: 13 },
        { field: "discount_code", start: 95, width: 1 },
        { field: "currency", start: 96, width: 2 },
        { field: "availability", start: 98, width: 1 },
        { field: "lead_time", start: 99, width: 2 },
        { field: "brand", start: 101, width: 2 },
        { field: "subcategory", start: 103, width: 2 },
        { field: "weight", start: 105, width: 6 },
        { field: "dimensions", start: 111, width: 15 },
        { field: "notes", start: 126, width: 20 }
      ],
      transformations: {
        gross_price: { type: "divide", divisor: 100 },
        net_price: { type: "divide", divisor: 100 },
        supplier_sku: { type: "trim" },
        description: { type: "trim" },
        category: { type: "trim" }
      }
    }
  },
  "semicolon-csv": {
    id: "semicolon-csv",
    name: "Semicolon CSV",
    type: "csv",
    config: {
      delimiter: ";",
      quote_char: "\"",
      has_header: true,
      skip_rows: 0,
      column_mapping: {
        supplier_sku: ["supplier_sku", "sku", "part_number"],
        net_price: ["net_price", "cost_price", "price"],
        variant_sku: ["variant_sku", "internal_sku"],
        description: ["description", "desc", "name"],
        category: ["category", "product_category"]
      }
    }
  }
}

/**
 * Retrieve a parser template by ID
 * @param templateId - The template identifier
 * @returns The parser template or null if not found
 */
export const getParserTemplate = (templateId: string): ParserTemplate | null => {
  return PARSER_TEMPLATES[templateId] || null
}

/**
 * List all available parser templates
 * @returns Array of all parser templates
 */
export const listParserTemplates = (): ParserTemplate[] => {
  return Object.values(PARSER_TEMPLATES)
}
