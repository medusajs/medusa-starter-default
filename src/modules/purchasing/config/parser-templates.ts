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
        cost_price: ["cost_price", "price", "net_price", "lijstprijs"],
        variant_sku: ["variant_sku", "internal_sku", "our_sku"],
        description: ["description", "desc", "name", "omschrijving"],
        quantity: ["quantity", "qty", "amount"],
        lead_time_days: ["lead_time", "lead_time_days", "delivery_time"],
        notes: ["notes", "comment", "remarks"]
      }
    }
  },
  "caterpillar-fixed-width": {
    id: "caterpillar-fixed-width",
    name: "Caterpillar Fixed Width",
    type: "fixed-width",
    config: {
      skip_rows: 1,
      fixed_width_columns: [
        { field: "supplier_sku", start: 0, width: 18 },
        { field: "description", start: 18, width: 40 },
        { field: "cost_price", start: 69, width: 13 },
        { field: "net_price", start: 82, width: 13 },
        { field: "currency", start: 95, width: 3 },
        { field: "availability", start: 98, width: 1 },
        { field: "lead_time", start: 99, width: 2 },
        { field: "brand", start: 101, width: 2 },
        { field: "category", start: 103, width: 2 },
        { field: "subcategory", start: 105, width: 2 },
        { field: "weight", start: 107, width: 6 },
        { field: "dimensions", start: 113, width: 15 },
        { field: "notes", start: 128, width: 20 }
      ],
      transformations: {
        cost_price: { type: "divide", divisor: 100000 },
        net_price: { type: "divide", divisor: 100000 },
        supplier_sku: { type: "trim" },
        description: { type: "trim" }
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
        cost_price: ["cost_price", "price", "net_price"],
        variant_sku: ["variant_sku", "internal_sku"],
        description: ["description", "desc", "name"]
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
