/**
 * Discount Calculation Workflow Step
 *
 * Calculate discount and net price for parsed price list items
 *
 * This step normalizes pricing data from various supplier formats:
 * - Discount codes → percentage lookup
 * - Direct percentages → net price calculation
 * - Pre-calculated prices → validation
 *
 * Runs after parsing, before saving to database.
 *
 * @see TEM-172 - Create Discount Calculation Workflow Step
 */

import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { ParsedPriceListItem } from "../types/parser-types"
import { DiscountStructure, PricingMode } from "../types/discount-types"
import PurchasingService from "../service"

type CalculateDiscountStepInput = {
  items: ParsedPriceListItem[]
  supplier_id: string
  pricing_mode: PricingMode
}

type CalculateDiscountStepOutput = {
  items: ParsedPriceListItem[]
}

/**
 * Process a single item's pricing calculation based on pricing mode
 *
 * Mode-aware processing:
 * - net_only: Only validate net price exists
 * - calculated: Validate gross + net, derive discount
 * - percentage: Calculate net from gross + percentage
 * - code_mapping: Resolve code → percentage → calculate net
 */
async function processItem(
  item: ParsedPriceListItem,
  pricingMode: PricingMode,
  discountStructure: DiscountStructure | null,
  purchasingService: PurchasingService,
  supplierName: string,
  itemNum: number
): Promise<ParsedPriceListItem> {

  const result = { ...item }

  // Mode: net_only - Only net price is provided
  if (pricingMode === "net_only") {
    if (!item.net_price || item.net_price <= 0) {
      throw new Error(
        `Missing or invalid net_price. Net-only mode requires a valid net price.`
      )
    }
    // Clear any discount information
    result.gross_price = undefined
    result.discount_percentage = undefined
    result.discount_code = undefined
    return result
  }

  // Mode: calculated - Both gross and net are provided (pre-calculated)
  if (pricingMode === "calculated") {
    if (!item.gross_price || item.gross_price <= 0) {
      throw new Error(
        `Missing or invalid gross_price. Pre-calculated mode requires both gross and net prices.`
      )
    }
    if (!item.net_price || item.net_price <= 0) {
      throw new Error(
        `Missing or invalid net_price. Pre-calculated mode requires both gross and net prices.`
      )
    }

    // Validate and derive discount
    const discountAmount = item.gross_price - item.net_price
    if (discountAmount < 0) {
      throw new Error(
        `Net price (${item.net_price}) exceeds gross price (${item.gross_price}). Check your data.`
      )
    }

    result.discount_percentage = (discountAmount / item.gross_price) * 100
    return result
  }

  // Mode: percentage - Gross + discount percentage
  if (pricingMode === "percentage") {
    if (!item.gross_price || item.gross_price <= 0) {
      throw new Error(
        `Missing or invalid gross_price. Percentage mode requires gross price and discount percentage.`
      )
    }
    if (item.discount_percentage === undefined || item.discount_percentage < 0 || item.discount_percentage > 100) {
      throw new Error(
        `Missing or invalid discount_percentage. Must be between 0 and 100.`
      )
    }

    // Calculate net price
    const discountAmount = item.gross_price * (item.discount_percentage / 100)
    result.net_price = item.gross_price - discountAmount
    return result
  }

  // Mode: code_mapping - Gross + discount code
  if (pricingMode === "code_mapping") {
    if (!item.gross_price || item.gross_price <= 0) {
      throw new Error(
        `Missing or invalid gross_price. Code mapping mode requires gross price and discount code.`
      )
    }
    if (!item.discount_code) {
      throw new Error(
        `Missing discount_code. Code mapping mode requires a discount code.`
      )
    }

    // Check if discount structure is configured
    if (!discountStructure || discountStructure.type !== "code_mapping") {
      throw new Error(
        `No discount code mappings configured for this supplier. ` +
        `Configure at Settings → Suppliers → ${supplierName} → Configuration`
      )
    }

    // Resolve discount code to percentage
    const percentage = purchasingService.resolveDiscountCode(
      item.discount_code,
      discountStructure
    )

    if (percentage === null) {
      const availableCodes = Object.keys(discountStructure.mappings || {}).join(', ')
      throw new Error(
        `Unknown discount code "${item.discount_code}". ` +
        `Available codes: ${availableCodes || 'none'}. ` +
        `Add code at Settings → Suppliers → ${supplierName} → Configuration`
      )
    }

    // Calculate net price
    result.discount_percentage = percentage
    const discountAmount = item.gross_price * (percentage / 100)
    result.net_price = item.gross_price - discountAmount
    return result
  }

  // Should never reach here due to TypeScript exhaustiveness checking
  throw new Error(`Unknown pricing mode: ${pricingMode}`)
}

/**
 * Calculate discount and net price for parsed price list items
 * Mode-aware processing based on pricing_mode parameter
 */
export const calculateDiscountAndNetPriceStep = createStep(
  "calculate-discount-and-net-price",
  async (
    input: CalculateDiscountStepInput,
    { container }
  ): Promise<CalculateDiscountStepOutput> => {

    const purchasingService = container.resolve("purchasingService") as PurchasingService

    // Fetch supplier information
    const supplier = await purchasingService.retrieveSupplier(input.supplier_id, {
      select: ["id", "name", "metadata"]
    })
    const supplierName = supplier.name || "this supplier"

    // Fetch supplier discount configuration
    const discountStructure = await purchasingService.getSupplierDiscountStructure(
      input.supplier_id
    )

    const processedItems: ParsedPriceListItem[] = []
    const errors: string[] = []

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i]
      const itemNum = i + 1

      try {
        const processed = await processItem(
          item,
          input.pricing_mode,
          discountStructure,
          purchasingService,
          supplierName,
          itemNum
        )
        processedItems.push(processed)
      } catch (error: any) {
        errors.push(`Row ${itemNum}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      // Limit error messages to first 50 to avoid overwhelming output
      const errorSample = errors.slice(0, 50)
      const errorMessage = errorSample.join('\n')
      const moreErrors = errors.length > 50 ? `\n... and ${errors.length - 50} more errors` : ''

      throw new Error(`Pricing calculation failed for ${errors.length} items:\n\n${errorMessage}${moreErrors}`)
    }

    return new StepResponse({ items: processedItems })
  },
  // Compensation: nothing to rollback (no data saved yet)
  async () => {
    return new StepResponse(void 0, {})
  }
)
