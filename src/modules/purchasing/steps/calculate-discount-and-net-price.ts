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
import { DiscountStructure } from "../types/discount-types"
import PurchasingService from "../service"

type CalculateDiscountStepInput = {
  items: ParsedPriceListItem[]
  supplier_id: string
}

type CalculateDiscountStepOutput = {
  items: ParsedPriceListItem[]
}

/**
 * Process a single item's pricing calculation
 *
 * Handles 5 scenarios:
 * 1. Discount code → Look up percentage from supplier config → Calculate net
 * 2. Direct percentage → Calculate discount amount → Calculate net
 * 3. Both gross & net → Validate and derive discount
 * 4. Net only → No calculation needed
 * 5. Error - insufficient data
 */
async function processItem(
  item: ParsedPriceListItem,
  discountStructure: DiscountStructure | null,
  purchasingService: PurchasingService,
  itemNum: number
): Promise<ParsedPriceListItem> {

  const result = { ...item }

  // Scenario 1: Discount code needs mapping
  if (item.discount_code && discountStructure) {
    const percentage = purchasingService.resolveDiscountCode(
      item.discount_code,
      discountStructure
    )

    if (percentage === null) {
      throw new Error(
        `Unknown discount code "${item.discount_code}" (no mapping found)`
      )
    }

    if (!item.gross_price) {
      throw new Error(
        `Discount code "${item.discount_code}" requires gross_price`
      )
    }

    result.discount_percentage = percentage
    const discountAmount = item.gross_price * (percentage / 100)
    result.net_price = item.gross_price - discountAmount
  }

  // Scenario 2: Direct percentage provided
  else if (item.discount_percentage !== undefined && item.gross_price) {
    const discountAmount = item.gross_price * (item.discount_percentage / 100)
    result.net_price = item.gross_price - discountAmount
  }

  // Scenario 3: Both gross and net provided (validate & derive)
  else if (item.gross_price && item.net_price) {
    const discountAmount = item.gross_price - item.net_price
    result.discount_percentage = (discountAmount / item.gross_price) * 100

    // Validate consistency
    if (discountAmount < 0) {
      throw new Error(
        `Net price (${item.net_price}) exceeds gross price (${item.gross_price})`
      )
    }
  }

  // Scenario 4: Only net price provided
  else if (item.net_price && !item.gross_price) {
    // Keep as-is, supplier doesn't provide gross
    result.gross_price = undefined
    result.discount_percentage = undefined
  }

  // Scenario 5: Error - insufficient data
  else {
    throw new Error(
      `Unable to calculate pricing. Need either: ` +
      `(gross_price + discount), (gross_price + net_price), or (net_price only)`
    )
  }

  // Final validation
  if (!result.net_price || result.net_price <= 0) {
    throw new Error(`Invalid or missing net_price`)
  }

  return result
}

/**
 * Calculate discount and net price for parsed price list items
 */
export const calculateDiscountAndNetPriceStep = createStep(
  "calculate-discount-and-net-price",
  async (
    input: CalculateDiscountStepInput,
    { container }
  ): Promise<CalculateDiscountStepOutput> => {

    const purchasingService = container.resolve("purchasingService") as PurchasingService

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
          discountStructure,
          purchasingService,
          itemNum
        )
        processedItems.push(processed)
      } catch (error: any) {
        errors.push(`Item ${itemNum}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Discount calculation failed:\n${errors.join('\n')}`)
    }

    return new StepResponse({ items: processedItems })
  },
  // Compensation: nothing to rollback (no data saved yet)
  async () => {
    return new StepResponse(void 0, {})
  }
)
