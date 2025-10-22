import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys
} from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "../../../modules/purchasing"

type ResolveVariantPricingConflictsInput = {
  supplier_price_list_id: string
  force_sync?: boolean
}

type VariantPriceUpdate = {
  variant_id: string
  product_id: string
  amount: number
  currency_code: string
  price_id?: string // For updating existing prices
}

type ItemToTrack = {
  id: string
  status: 'synced' | 'skipped' | 'error'
  error?: string
}

type ResolveVariantPricingConflictsOutput = {
  variantsToUpdate: VariantPriceUpdate[]
  itemsToTrack: ItemToTrack[]
}

/**
 * Resolves which variants should be updated with which prices from the supplier price list.
 *
 * This step:
 * 1. Loads price list items with gross_price from the specified supplier
 * 2. Checks if the supplier is configured as a pricing source
 * 3. Resolves conflicts when multiple suppliers have prices for the same variant
 * 4. Returns the list of variants to update and items to track
 */
export const resolveVariantPricingConflictsStep = createStep(
  "resolve-variant-pricing-conflicts",
  async (input: ResolveVariantPricingConflictsInput, { container }) => {
    const purchasingService = container.resolve(PURCHASING_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve("logger")

    // Load the price list
    const { data: [priceListData] } = await query.graph({
      entity: "supplier_price_list",
      fields: [
        "id",
        "supplier_id",
        "currency_code",
      ],
      filters: {
        id: input.supplier_price_list_id,
      },
    })

    if (!priceListData) {
      throw new Error(`Price list ${input.supplier_price_list_id} not found`)
    }

    // Load the supplier separately since there's no defined relationship
    const { data: [supplierData] } = await query.graph({
      entity: "supplier",
      fields: [
        "id",
        "name",
        "is_pricing_source",
        "pricing_priority",
      ],
      filters: {
        id: priceListData.supplier_id,
      },
    })

    if (!supplierData) {
      throw new Error(`Supplier ${priceListData.supplier_id} not found`)
    }

    // Check if supplier is configured as a pricing source
    if (!supplierData.is_pricing_source && !input.force_sync) {
      logger.warn(
        `Supplier ${supplierData.name} is not configured as a pricing source. Use force_sync to override.`
      )
      return new StepResponse<ResolveVariantPricingConflictsOutput>({
        variantsToUpdate: [],
        itemsToTrack: [],
      })
    }

    // Load all price list items with gross_price
    const priceListItems = await purchasingService.listSupplierPriceListItems({
      price_list_id: input.supplier_price_list_id,
    })

    const variantsToUpdate: VariantPriceUpdate[] = []
    const itemsToTrack: ItemToTrack[] = []

    // Group items by variant_id to handle duplicates
    const itemsByVariant = new Map<string, typeof priceListItems>()
    for (const item of priceListItems) {
      // Skip manual entries (they don't have real product variants)
      if (item.product_variant_id?.startsWith('manual-')) {
        itemsToTrack.push({
          id: item.id,
          status: 'skipped',
          error: 'Manual entry - not synced to product catalog',
        })
        continue
      }

      if (!item.gross_price) {
        itemsToTrack.push({
          id: item.id,
          status: 'skipped',
          error: 'No gross_price specified',
        })
        continue
      }

      const existing = itemsByVariant.get(item.product_variant_id)
      if (existing) {
        existing.push(item)
      } else {
        itemsByVariant.set(item.product_variant_id, [item])
      }
    }

    // Process each variant
    for (const [variantId, items] of Array.from(itemsByVariant.entries())) {
      try {
        // If multiple items for same variant, use the first one (or implement more complex logic)
        const itemToUse = items[0]

        // Check for competing price lists from other suppliers
        // Query just the items first without trying to access nested relationships
        const { data: competingItems } = await query.graph({
          entity: "supplier_price_list_item",
          fields: [
            "id",
            "gross_price",
            "price_list_id",
          ],
          filters: {
            product_variant_id: variantId,
            gross_price: { $ne: null },
            price_list_id: { $ne: input.supplier_price_list_id },
          },
        })

        // Now check if any of these competing items have higher priority suppliers
        let hasHigherPriority = false
        const currentPriority = supplierData.pricing_priority || 0

        for (const competingItem of competingItems) {
          // Load the competing price list and its supplier separately
          const { data: [competingPriceList] } = await query.graph({
            entity: "supplier_price_list",
            fields: ["id", "supplier_id", "is_active"],
            filters: { id: competingItem.price_list_id },
          })

          if (!competingPriceList || !competingPriceList.is_active) {
            continue
          }

          const { data: [competingSupplier] } = await query.graph({
            entity: "supplier",
            fields: ["id", "is_pricing_source", "pricing_priority"],
            filters: { id: competingPriceList.supplier_id },
          })

          if (competingSupplier?.is_pricing_source &&
              (competingSupplier.pricing_priority || 0) > currentPriority) {
            hasHigherPriority = true
            break
          }
        }

        if (hasHigherPriority && !input.force_sync) {
          // Skip this variant - another supplier has higher priority
          for (const item of items) {
            itemsToTrack.push({
              id: item.id,
              status: 'skipped',
              error: 'Another supplier has higher pricing priority',
            })
          }
          logger.debug(
            `Skipping variant ${variantId} - another supplier has higher priority`
          )
          continue
        }

        // Query existing prices for this variant using the variant entity
        let existingPriceId: string | undefined
        try {
          const { data: variants } = await query.graph({
            entity: "product_variant",
            fields: [
              "id",
              "prices.id",
              "prices.currency_code",
              "prices.amount",
            ],
            filters: {
              id: variantId,
            },
          })

          if (variants && variants.length > 0 && variants[0].prices) {
            // Find the price with matching currency
            const matchingPrice = variants[0].prices.find(
              (p: any) => p.currency_code === priceListData.currency_code
            )

            if (matchingPrice) {
              existingPriceId = matchingPrice.id
              logger.debug(
                `Found existing price ${existingPriceId} for variant ${variantId} with currency ${priceListData.currency_code}`
              )
            }
          }
        } catch (error) {
          logger.warn(
            `Could not query existing prices for variant ${variantId}: ${error}`
          )
        }

        // Add to update list
        variantsToUpdate.push({
          variant_id: variantId,
          product_id: itemToUse.product_id,
          amount: Number(itemToUse.gross_price),
          currency_code: priceListData.currency_code,
          price_id: existingPriceId,
        })

        // Track all items for this variant as synced
        for (const item of items) {
          itemsToTrack.push({
            id: item.id,
            status: 'synced',
          })
        }
      } catch (error) {
        // Track error for all items of this variant
        for (const item of items) {
          itemsToTrack.push({
            id: item.id,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          })
        }
        logger.error(
          `Error resolving pricing for variant ${variantId}: ${error}`
        )
      }
    }

    logger.info(
      `Resolved ${variantsToUpdate.length} variants to update from price list ${input.supplier_price_list_id}`
    )

    return new StepResponse<ResolveVariantPricingConflictsOutput>({
      variantsToUpdate,
      itemsToTrack,
    })
  }
)
