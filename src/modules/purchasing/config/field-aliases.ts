/**
 * Field Aliases Configuration for Parser Column Matching
 *
 * This file defines the common variations of column names for each field.
 * Used for intelligent column matching when parsing supplier price lists.
 *
 * @see TEM-154 - Create Parser Types and Configuration Schemas
 */

/**
 * Mapping of canonical field names to their common variations
 * Supports smart column matching across different supplier formats
 */
export const FIELD_ALIASES = {
  supplier_sku: [
    "sku",
    "part_number",
    "part_no",
    "partnumber",
    "onderdeelnummer",
    "supplier_part",
    "supplier_sku",
    "part_id"
  ],
  cost_price: [
    "price",
    "cost",
    "net_price",
    "unit_price",
    "lijstprijs",
    "cost_price",
    "selling_price",
    "gross_price"
  ],
  variant_sku: [
    "variant_sku",
    "internal_sku",
    "our_sku",
    "product_sku",
    "item_sku",
    "sku"
  ],
  description: [
    "description",
    "desc",
    "name",
    "omschrijving",
    "product_name",
    "item_name",
    "title"
  ],
  quantity: [
    "quantity",
    "qty",
    "amount",
    "stock",
    "available"
  ],
  lead_time_days: [
    "lead_time",
    "lead_time_days",
    "delivery_time",
    "days",
    "weeks"
  ],
  notes: [
    "notes",
    "comment",
    "remarks",
    "info"
  ]
} as const

/**
 * Type-safe field name extractor
 */
export type FieldName = keyof typeof FIELD_ALIASES
