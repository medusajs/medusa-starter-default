import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules
} from "@medusajs/framework/utils"

export default async function setupData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionModuleService = container.resolve(Modules.REGION)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("Setting up necessary data for orders...")

  // Check if regions exist
  const regions = await regionModuleService.listRegions()
  if (!regions.length) {
    logger.info("Creating Belgium region...")
    await regionModuleService.createRegions([
      {
        name: "Belgium",
        currency_code: "eur",
        countries: ["be"],
        automatic_taxes: true
      }
    ])
    logger.info("Belgium region created successfully!")
  } else {
    logger.info(`Found ${regions.length} existing regions`)
  }

  // Check sales channels
  const salesChannels = await salesChannelModuleService.listSalesChannels()
  logger.info(`Found ${salesChannels.length} sales channels`)

  // Check products and set prices if needed
  const products = await productModuleService.listProducts()
  if (products.length) {
    logger.info(`Found ${products.length} products`)
    
    // Set prices for variants if they're €0
    for (const product of products) {
      const variants = await productModuleService.listProductVariants({
        product_id: product.id
      })
      
      for (const variant of variants) {
        // Check if variant has no prices or price is 0
        const hasValidPrice = variant.prices && variant.prices.length > 0 && variant.prices[0].amount > 0
        
        if (!hasValidPrice) {
          logger.info(`Setting price for variant ${variant.id} (${variant.title})`)
          
          // Set price based on product
          const price = product.title?.includes("Coffee Mug") ? 1500 : 3500 // €15 or €35
          
          await productModuleService.updateProductVariants(
            variant.id,
            {
              prices: [
                {
                  amount: price,
                  currency_code: "eur"
                }
              ]
            }
          )
        }
      }
    }
  }

  logger.info("Data setup completed!")
} 