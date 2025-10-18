/**
 * Validation schemas for supplier discount structures
 *
 * This module uses Zod to validate discount configuration data before storing it in supplier metadata.
 * All validations ensure data integrity and prevent invalid discount configurations.
 */

import { z } from "zod"
import type { DiscountStructure } from "../types/discount-types"

/**
 * Schema for code mapping discount structure
 * Validates that discount codes map to percentages between 0 and 100
 */
export const codeMappingSchema = z.object({
  type: z.literal("code_mapping"),
  description: z.string().optional(),
  mappings: z.record(z.string(), z.number().min(0).max(100))
})

/**
 * Schema for fixed percentage discount structure
 * Validates that the percentage is between 0 and 100
 */
export const percentageSchema = z.object({
  type: z.literal("percentage"),
  description: z.string().optional(),
  default_percentage: z.number().min(0).max(100)
})

/**
 * Schema for pre-calculated discount structure
 * No additional validation needed beyond the type
 */
export const calculatedSchema = z.object({
  type: z.literal("calculated"),
  description: z.string().optional()
})

/**
 * Schema for net-only discount structure
 * No additional validation needed beyond the type
 */
export const netOnlySchema = z.object({
  type: z.literal("net_only"),
  description: z.string().optional()
})

/**
 * Discriminated union schema for all discount structure types
 * This ensures only valid discount structures can be stored
 */
export const discountStructureSchema = z.discriminatedUnion("type", [
  codeMappingSchema,
  percentageSchema,
  calculatedSchema,
  netOnlySchema
])

/**
 * Validate discount structure data
 *
 * @param data - The data to validate
 * @returns The validated discount structure
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * // Valid code mapping
 * const structure = validateDiscountStructure({
 *   type: "code_mapping",
 *   mappings: { A: 25, B: 35 }
 * })
 *
 * // Invalid percentage (throws error)
 * validateDiscountStructure({
 *   type: "percentage",
 *   default_percentage: 150  // Error: must be <= 100
 * })
 * ```
 */
export function validateDiscountStructure(data: unknown): DiscountStructure {
  return discountStructureSchema.parse(data)
}
