import {
  createWorkflow,
  WorkflowResponse,
  transform,
  when
} from "@medusajs/framework/workflows-sdk"
import {
  findOrCreateProductAndVariantByPartNumberStep,
  linkVariantsToPriceListItemsStep
} from "./steps"

export type CreateVariantsFromSupplierPartNumbersInput = {
  supplier_price_list_id: string
  /**
   * Whether to skip items that already have a product_variant_id
   * @default true
   */
  skip_existing?: boolean
}

export const createVariantsFromSupplierPartNumbersWorkflowId =
  "create-variants-from-supplier-partnumbers"

/**
 * Creates product variants for supplier part numbers that don't exist in the catalog yet.
 *
 * This workflow:
 * 1. Finds price list items without matching product_variant_id
 * 2. For each orphaned part number (supplier_sku):
 *    - Creates a product with ID = supplier partnumber
 *    - Creates a variant with SKU = supplier partnumber
 *    - Sets variant price to supplier gross_price
 *    - Adds supplier reference to variant metadata
 * 3. Links created variants back to price list items
 *
 * @param input - Configuration for the variant creation
 * @returns Summary of created products, variants, and linked items
 */
export const createVariantsFromSupplierPartNumbersWorkflow = createWorkflow(
  createVariantsFromSupplierPartNumbersWorkflowId,
  (input: CreateVariantsFromSupplierPartNumbersInput) => {

    // Step 1: Find orphaned price list items and create products/variants for them
    const { createdProducts, createdVariants, itemsToLink, skippedItems } =
      findOrCreateProductAndVariantByPartNumberStep(input)

    // Step 2: Link the created variants back to the price list items
    // Only run if there are items to link
    const linkedItems = when(itemsToLink, (items) => items.length > 0).then(() => {
      return linkVariantsToPriceListItemsStep({
        items_to_link: itemsToLink
      })
    })

    return new WorkflowResponse({
      created_products: createdProducts,
      created_variants: createdVariants,
      linked_items: linkedItems,
      skipped_items: skippedItems,
      summary: transform(
        { createdProducts, createdVariants, skippedItems },
        ({ createdProducts, createdVariants, skippedItems }) => ({
          total_products_created: createdProducts.length,
          total_variants_created: createdVariants.length,
          total_items_skipped: skippedItems.length,
        })
      )
    })
  }
)
