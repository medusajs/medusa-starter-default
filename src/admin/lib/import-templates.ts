/**
 * Import Template Registry
 *
 * Code-based templates for the price list import wizard.
 * These templates are version-controlled and deployed to all instances via git.
 *
 * To add a new template:
 * 1. Add a new entry to the IMPORT_TEMPLATES object
 * 2. Define the parse_config and column_mapping
 * 3. Commit and push to deploy to all instances
 */

import { ParseConfig } from '../components/import-wizard/Step2ParseConfiguration'

export interface ImportTemplate {
  id: string
  name: string
  description: string
  file_type: 'csv' | 'txt'
  parse_config: ParseConfig
  column_mapping: Record<string, string>
}

export const IMPORT_TEMPLATES: Record<string, ImportTemplate> = {
  /**
   * CNH Template
   * Fixed-width format for CNH (Dutch supplier) price lists
   * Based on column widths: [18, 40, 1, 1, 8, 11, 13, 5, 4, 1, 5, 5, 1, 3]
   */
  'cnh': {
    id: 'cnh',
    name: 'CNH',
    description: 'Fixed-width format for CNH (Dutch supplier) price lists',
    file_type: 'txt',
    parse_config: {
      format_type: 'fixed-width',
      skip_rows: 1,
      fixed_width_columns: [
        { name: "onderdeelnummer", start: 0, width: 18 },           // Supplier part number
        { name: "omschrijving", start: 18, width: 40 },             // Description
        { name: "prijscode", start: 58, width: 1 },                 // Price code
        { name: "material_status", start: 59, width: 1 },           // Material status
        { name: "datum_prijsaanpassing", start: 60, width: 8 },     // Last price update (YYYYMMDD)
        { name: "lijstprijs", start: 68, width: 11 },               // List price (cents)
        { name: "gewicht_kg", start: 79, width: 13 },               // Weight (grams)
        { name: "verpakkingseenheid", start: 92, width: 5 },        // Packaging unit
        { name: "first_product_line", start: 97, width: 4 },        // Product line
        { name: "sdc", start: 101, width: 1 },                      // SDC
        { name: "pcc", start: 102, width: 5 },                      // PCC
        { name: "mpc", start: 107, width: 5 },                      // MPC
        { name: "retour_indicator", start: 112, width: 1 },         // Return indicator
        { name: "niet_gebruikt", start: 113, width: 3 },            // Not used
        { name: "mpc_mpl", start: 107, width: 5 },                  // Virtual: MPL from MPC
      ],
      transformations: {
        "onderdeelnummer": { type: "trim_zeros" },                  // Remove leading zeros
        "lijstprijs": { type: "divide", divisor: 100 },             // Convert cents to euros
        "gewicht_kg": { type: "divide", divisor: 1000 },            // Convert grams to kg
        "datum_prijsaanpassing": { type: "date", input_format: "YYYYMMDD" }, // Parse date
        "verpakkingseenheid": { type: "trim_zeros" },               // Remove leading zeros
        "mpc_mpl": { type: "substring", start: 0, length: 3 },      // Extract first 3 chars
      },
    },
    column_mapping: {
      "onderdeelnummer": "supplier_sku",
      "omschrijving": "description",
      "lijstprijs": "net_price",
      "gewicht_kg": "weight",
      "prijscode": "price_code",
      "material_status": "material_status",
      "datum_prijsaanpassing": "last_price_update",
      "verpakkingseenheid": "packaging_unit",
      "first_product_line": "product_line",
      "mpc": "mpc",
      "mpc_mpl": "mpl",
      "pcc": "pcc",
      "sdc": "sdc",
      "retour_indicator": "return_indicator",
    }
  },

  // Add more templates here as needed:
  // 'john-deere': { ... },
  // 'caterpillar': { ... },
}
