/**
 * Supplier discount configuration types
 *
 * This module defines the types for storing and managing supplier-specific discount structures.
 * Each supplier can have a different discount format (code mappings, percentages, pre-calculated, or net-only).
 */

/**
 * Available discount structure types
 */
export type DiscountStructureType =
  | "code_mapping"
  | "percentage"
  | "calculated"
  | "net_only"

/**
 * Code mapping structure (e.g., Caterpillar)
 * Maps discount codes (like 'A', 'B') to percentage values
 *
 * Example:
 * ```json
 * {
 *   "type": "code_mapping",
 *   "description": "Caterpillar discount code structure",
 *   "mappings": {
 *     "A": 25.0,
 *     "B": 35.0,
 *     "C": 40.0
 *   }
 * }
 * ```
 */
export type CodeMappingStructure = {
  type: "code_mapping"
  description?: string
  mappings: Record<string, number>  // code -> percentage
}

/**
 * Fixed percentage structure
 * Single percentage discount applied to all items
 *
 * Example:
 * ```json
 * {
 *   "type": "percentage",
 *   "description": "Fixed 20% discount on all items",
 *   "default_percentage": 20.0
 * }
 * ```
 */
export type PercentageStructure = {
  type: "percentage"
  description?: string
  default_percentage: number
}

/**
 * Pre-calculated structure
 * Supplier provides both gross and net prices (discount is derived)
 *
 * Example:
 * ```json
 * {
 *   "type": "calculated",
 *   "description": "Supplier provides both gross and net prices"
 * }
 * ```
 */
export type CalculatedStructure = {
  type: "calculated"
  description?: string
}

/**
 * Net-only structure
 * Supplier only provides net prices (no discount information)
 *
 * Example:
 * ```json
 * {
 *   "type": "net_only",
 *   "description": "Supplier only provides net prices"
 * }
 * ```
 */
export type NetOnlyStructure = {
  type: "net_only"
  description?: string
}

/**
 * Discriminated union of all discount structure types
 * This ensures type safety when working with different discount structures
 */
export type DiscountStructure =
  | CodeMappingStructure
  | PercentageStructure
  | CalculatedStructure
  | NetOnlyStructure

/**
 * Extended supplier metadata type
 * This is stored in the supplier.metadata field
 */
export type SupplierMetadata = {
  discount_structure?: DiscountStructure
  // ... other metadata fields can be added here
}
