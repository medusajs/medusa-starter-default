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
  variant_sku: [
    "variant_sku",
    "internal_sku",
    "our_sku",
    "product_sku",
    "item_sku",
    "sku"
  ],

  // Pricing fields - TEM-173: Support for flexible discount structures
  gross_price: [
    "gross_price",
    "gross price",
    "list_price",
    "list price",
    "listprice",
    "lijstprijs",
    "bruto prijs",
    "gross",
    "msrp",
    "retail_price",
    "retail price"
  ],
  discount_code: [
    "discount_code",
    "discount code",
    "discount_cd",
    "disc_code",
    "kortingscode",
    "rabattcode",
    "code",
    "disc_cd"
  ],
  discount_percentage: [
    "discount_percentage",
    "discount %",
    "discount_pct",
    "disc_pct",
    "discount_percent",
    "korting %",
    "korting percentage",
    "rabatt %"
  ],
  net_price: [
    "net_price",
    "net price",
    "netto prijs",
    "final_price",
    "cost_price",
    "purchase_price",
    "inkoopprijs",
    "net"
  ],

  // Legacy field for backward compatibility
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

  // Product information fields - TEM-173
  product_title: [
    "product_title",
    "product_name",
    "product name",
    "product",
    "title",
    "name",
    "productnaam",
    "artikel"
  ],
  variant_title: [
    "variant_title",
    "variant_name",
    "variant name",
    "variant",
    "option",
    "size",
    "color",
    "variantnaam"
  ],
  description: [
    "description",
    "product_description",
    "desc",
    "omschrijving",
    "beschrijving",
    "product description",
    "product_desc",
    "item_description",
    "item description"
  ],
  category: [
    "category",
    "product_category",
    "cat",
    "categorie",
    "productcategorie",
    "product category",
    "item_category",
    "group",
    "product_group"
  ],

  // Other fields
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
