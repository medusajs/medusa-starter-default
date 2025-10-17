/**
 * Parser Types for Flexible Price List Upload System
 *
 * This file defines the core types for parsing supplier price lists
 * in various formats (CSV, fixed-width text files).
 *
 * @see TEM-154 - Create Parser Types and Configuration Schemas
 */

/**
 * Supported parser types
 */
export type ParserType = "csv" | "fixed-width"

/**
 * Main parser configuration that wraps type-specific configs
 */
export type ParserConfig = {
  type: ParserType
  template_name?: string
  config: CsvConfig | FixedWidthConfig
}

/**
 * CSV parser configuration
 */
export type CsvConfig = {
  delimiter: string
  quote_char: string
  has_header: boolean
  skip_rows: number
  column_mapping: Record<string, string | string[]>
  transformations?: Record<string, Transformation>
}

/**
 * Fixed-width text file parser configuration
 */
export type FixedWidthConfig = {
  skip_rows: number
  fixed_width_columns: Array<{
    field: string
    start: number
    width: number
  }>
  transformations?: Record<string, Transformation>
}

/**
 * Supported transformation types for data processing
 */
export type Transformation =
  | { type: "divide", divisor: number }
  | { type: "multiply", multiplier: number }
  | { type: "trim" }
  | { type: "uppercase" }
  | { type: "lowercase" }

/**
 * Parsed price list item structure
 */
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

/**
 * Result of parsing operation
 */
export type ParseResult = {
  items: ParsedPriceListItem[]
  errors: string[]
  total_rows: number
  processed_rows: number
  warnings?: string[]
}

/**
 * Parser template definition
 */
export type ParserTemplate = {
  id: string
  name: string
  type: ParserType
  config: CsvConfig | FixedWidthConfig
}
