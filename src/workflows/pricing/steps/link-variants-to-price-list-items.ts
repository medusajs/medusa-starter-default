import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import { PURCHASING_MODULE } from "../../../modules/purchasing"

type ItemToLink = {
  price_list_item_id: string
  variant_id: string
  product_id: string
}

type LinkVariantsToPriceListItemsInput = {
  items_to_link: ItemToLink[]
}

type LinkedItem = {
  price_list_item_id: string
  variant_id: string
  product_id: string
}

type LinkVariantsToPriceListItemsOutput = {
  linked_items: LinkedItem[]
}

/**
 * Links created variants back to their corresponding price list items
 * by updating the product_variant_id and product_id fields.
 *
 * This step:
 * 1. Takes a list of items with their newly created variant IDs
 * 2. Updates each price list item to link it to the variant
 * 3. Tracks which items were successfully linked
 */
export const linkVariantsToPriceListItemsStep = createStep(
  "link-variants-to-price-list-items",
  async (input: LinkVariantsToPriceListItemsInput, { container }) => {
    const purchasingService = container.resolve(PURCHASING_MODULE)
    const logger = container.resolve("logger")

    const linkedItems: LinkedItem[] = []
    const previousValues: Array<{ id: string, product_variant_id: string | null, product_id: string | null }> = []

    // Update each price list item with the variant and product IDs
    for (const item of input.items_to_link) {
      try {
        // Retrieve current values for rollback
        const currentItem = await purchasingService.retrieveSupplierPriceListItem(
          item.price_list_item_id
        )

        previousValues.push({
          id: currentItem.id,
          product_variant_id: currentItem.product_variant_id,
          product_id: currentItem.product_id,
        })

        // Update with new variant and product IDs
        await purchasingService.updateSupplierPriceListItems([{
          id: item.price_list_item_id,
          product_variant_id: item.variant_id,
          product_id: item.product_id,
        }])

        linkedItems.push({
          price_list_item_id: item.price_list_item_id,
          variant_id: item.variant_id,
          product_id: item.product_id,
        })

        logger.debug(
          `Linked price list item ${item.price_list_item_id} to variant ${item.variant_id}`
        )
      } catch (error) {
        logger.error(
          `Failed to link price list item ${item.price_list_item_id} to variant ${item.variant_id}: ${error}`
        )
      }
    }

    logger.info(`Successfully linked ${linkedItems.length} price list items to variants`)

    return new StepResponse<LinkVariantsToPriceListItemsOutput>(
      {
        linked_items: linkedItems,
      },
      {
        // Store previous values for compensation
        previous_values: previousValues,
      }
    )
  },
  async (compensation, { container }) => {
    if (!compensation || !compensation.previous_values) {
      return
    }

    const purchasingService = container.resolve(PURCHASING_MODULE)
    const logger = container.resolve("logger")

    // Rollback: restore previous values
    try {
      await purchasingService.updateSupplierPriceListItems(
        compensation.previous_values.map(item => ({
          id: item.id,
          product_variant_id: item.product_variant_id,
          product_id: item.product_id,
        }))
      )
      logger.info(`Rolled back ${compensation.previous_values.length} price list item links`)
    } catch (error) {
      logger.error(`Failed to rollback price list item links: ${error}`)
    }
  }
)
