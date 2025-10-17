/**
 * Validation Schemas for Parser Configuration
 *
 * Zod schemas for validating parser configurations, ensuring data integrity
 * and type safety for parser operations.
 *
 * @see TEM-154 - Create Parser Types and Configuration Schemas
 */

import { z } from "zod"

/**
 * Schema for transformation configuration
 */
export const transformationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("divide"),
    divisor: z.number().positive()
  }),
  z.object({
    type: z.literal("multiply"),
    multiplier: z.number().positive()
  }),
  z.object({
    type: z.literal("trim")
  }),
  z.object({
    type: z.literal("uppercase")
  }),
  z.object({
    type: z.literal("lowercase")
  })
])

/**
 * Schema for CSV parser configuration
 */
export const csvConfigSchema = z.object({
  delimiter: z.string().length(1),
  quote_char: z.string().length(1),
  has_header: z.boolean(),
  skip_rows: z.number().min(0),
  column_mapping: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  transformations: z.record(z.string(), transformationSchema).optional()
})

/**
 * Schema for fixed-width parser configuration
 */
export const fixedWidthConfigSchema = z.object({
  skip_rows: z.number().min(0),
  fixed_width_columns: z.array(z.object({
    field: z.string().min(1),
    start: z.number().min(0),
    width: z.number().min(1)
  })),
  transformations: z.record(z.string(), transformationSchema).optional()
})

/**
 * Schema for parser configuration
 */
export const parserConfigSchema = z.object({
  type: z.enum(["csv", "fixed-width"]),
  template_name: z.string().optional(),
  config: z.union([csvConfigSchema, fixedWidthConfigSchema])
})

/**
 * Schema for parsed price list item
 */
export const parsedPriceListItemSchema = z.object({
  product_variant_id: z.string().optional(),
  product_id: z.string().optional(),
  supplier_sku: z.string().optional(),
  variant_sku: z.string().optional(),
  cost_price: z.number().positive(),
  description: z.string().optional(),
  quantity: z.number().positive().optional(),
  lead_time_days: z.number().min(0).optional(),
  notes: z.string().optional()
})

/**
 * Schema for parse result
 */
export const parseResultSchema = z.object({
  items: z.array(parsedPriceListItemSchema),
  errors: z.array(z.string()),
  total_rows: z.number().min(0),
  processed_rows: z.number().min(0),
  warnings: z.array(z.string()).optional()
})
