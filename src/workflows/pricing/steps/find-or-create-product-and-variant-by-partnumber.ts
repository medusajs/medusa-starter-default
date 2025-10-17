import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules
} from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "../../../modules/purchasing"

type FindOrCreateProductAndVariantByPartNumberInput = {
  supplier_price_list_id: string
  skip_existing?: boolean
}

type ItemToLink = {
  price_list_item_id: string
  variant_id: string
  product_id: string
}

type SkippedItem = {
  price_list_item_id: string
  supplier_sku: string
  reason: string
}

type CreatedProduct = {
  id: string
  title: string
  sku: string
}

type CreatedVariant = {
  id: string
  product_id: string
  sku: string
  title: string
}

type FindOrCreateProductAndVariantByPartNumberOutput = {
  createdProducts: CreatedProduct[]
  createdVariants: CreatedVariant[]
  itemsToLink: ItemToLink[]
  skippedItems: SkippedItem[]
}

/**
 * Finds price list items without product_variant_id and creates products/variants
 * using the supplier part number as both product ID and variant SKU.
 *
 * This step:
 * 1. Loads price list items that don't have a product_variant_id
 * 2. For each orphaned item with a supplier_sku:
 *    - Checks if a product with ID = supplier_sku already exists
 *    - If not, creates a product with ID = supplier_sku
 *    - Creates a variant with SKU = supplier_sku and price = gross_price
 *    - Adds supplier reference to variant metadata
 * 3. Returns lists of created products, variants, and items to link
 */
export const findOrCreateProductAndVariantByPartNumberStep = createStep(
  "find-or-create-product-and-variant-by-partnumber",
  async (input: FindOrCreateProductAndVariantByPartNumberInput, { container }) => {
    const purchasingService = container.resolve(PURCHASING_MODULE)
    const productModule = container.resolve(Modules.PRODUCT)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve("logger")

    const skipExisting = input.skip_existing ?? true

    // Load the price list with supplier info
    const { data: [priceListData] } = await query.graph({
      entity: "supplier_price_list",
      fields: [
        "id",
        "supplier_id",
        "currency_code",
        "supplier.id",
        "supplier.name",
      ],
      filters: {
        id: input.supplier_price_list_id,
      },
    })

    if (!priceListData) {
      throw new Error(`Price list ${input.supplier_price_list_id} not found`)
    }

    // Load all price list items
    const priceListItems = await purchasingService.listSupplierPriceListItems({
      price_list_id: input.supplier_price_list_id,
    })

    const createdProducts: CreatedProduct[] = []
    const createdVariants: CreatedVariant[] = []
    const itemsToLink: ItemToLink[] = []
    const skippedItems: SkippedItem[] = []

    // Filter for items without product_variant_id
    const orphanedItems = priceListItems.filter(item => {
      if (item.product_variant_id && skipExisting) {
        return false
      }
      if (!item.supplier_sku) {
        skippedItems.push({
          price_list_item_id: item.id,
          supplier_sku: item.supplier_sku || 'N/A',
          reason: 'Missing supplier_sku',
        })
        return false
      }
      return true
    })

    logger.info(
      `Found ${orphanedItems.length} orphaned items in price list ${input.supplier_price_list_id}`
    )

    // Process each orphaned item
    for (const item of orphanedItems) {
      try {
        const partNumber = item.supplier_sku!

        // Check if product with this ID already exists
        let product
        try {
          product = await productModule.retrieveProduct(partNumber, {
            select: ["id", "title"],
          })
          logger.debug(`Product ${partNumber} already exists`)
        } catch (error) {
          // Product doesn't exist, create it
          logger.info(`Creating product with ID: ${partNumber}`)
          const [createdProduct] = await productModule.createProducts([{
            id: partNumber,
            title: partNumber,
            status: "published",
            is_giftcard: false,
          }])
          product = createdProduct
          createdProducts.push({
            id: product.id,
            title: product.title,
            sku: partNumber,
          })
        }

        // Check if a variant with this SKU already exists for this product
        const existingVariants = await productModule.listProductVariants({
          product_id: product.id,
          sku: partNumber,
        }, {
          select: ["id", "sku", "product_id"],
        })

        let variant
        if (existingVariants.length > 0) {
          variant = existingVariants[0]
          logger.debug(`Variant with SKU ${partNumber} already exists`)
        } else {
          // Create variant with supplier part number as SKU
          logger.info(`Creating variant with SKU: ${partNumber} for product ${product.id}`)

          const variantData: any = {
            product_id: product.id,
            title: partNumber,
            sku: partNumber,
            manage_inventory: true,
            allow_backorder: false,
            metadata: {
              supplier_id: priceListData.supplier.id,
              supplier_name: priceListData.supplier.name,
            },
          }

          // Add price if gross_price is available
          if (item.gross_price) {
            variantData.prices = [{
              amount: Number(item.gross_price),
              currency_code: priceListData.currency_code,
            }]
          }

          const [createdVariant] = await productModule.createProductVariants([variantData])
          variant = createdVariant

          createdVariants.push({
            id: variant.id,
            product_id: product.id,
            sku: partNumber,
            title: partNumber,
          })
        }

        // Add to link list
        itemsToLink.push({
          price_list_item_id: item.id,
          variant_id: variant.id,
          product_id: product.id,
        })

      } catch (error) {
        logger.error(
          `Error creating product/variant for part number ${item.supplier_sku}: ${error}`
        )
        skippedItems.push({
          price_list_item_id: item.id,
          supplier_sku: item.supplier_sku!,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    logger.info(
      `Created ${createdProducts.length} products and ${createdVariants.length} variants. Skipped ${skippedItems.length} items.`
    )

    return new StepResponse<FindOrCreateProductAndVariantByPartNumberOutput>(
      {
        createdProducts,
        createdVariants,
        itemsToLink,
        skippedItems,
      },
      {
        // Compensation function to rollback created products and variants
        createdProductIds: createdProducts.map(p => p.id),
        createdVariantIds: createdVariants.map(v => v.id),
      }
    )
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const productModule = container.resolve(Modules.PRODUCT)
    const logger = container.resolve("logger")

    // Rollback: delete created variants
    if (compensation.createdVariantIds.length > 0) {
      try {
        await productModule.deleteProductVariants(compensation.createdVariantIds)
        logger.info(`Rolled back ${compensation.createdVariantIds.length} created variants`)
      } catch (error) {
        logger.error(`Failed to rollback variants: ${error}`)
      }
    }

    // Rollback: delete created products
    if (compensation.createdProductIds.length > 0) {
      try {
        await productModule.deleteProducts(compensation.createdProductIds)
        logger.info(`Rolled back ${compensation.createdProductIds.length} created products`)
      } catch (error) {
        logger.error(`Failed to rollback products: ${error}`)
      }
    }
  }
)
