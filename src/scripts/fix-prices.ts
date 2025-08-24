import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function fixPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Starting price fix process...");

  try {
    // Get all products with their variants and prices
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.*"
      ],
    });

    logger.info(`Found ${products.length} products to check`);

    let updatedCount = 0;
    let totalPriceUpdates = 0;

    for (const product of products) {
      let productNeedsUpdate = false;
      const updatedVariants: any[] = [];

      for (const variant of product.variants) {
        let variantNeedsUpdate = false;
        const updatedPrices: any[] = [];

        for (const price of (variant as any).prices || []) {
          // Check if this is a EUR price that's too high (likely 100x too high)
          if (price.currency_code === 'eur' && price.amount > 1000) {
            const originalAmount = price.amount;
            const correctedAmount = Math.round(price.amount / 100);
            
            logger.info(`Fixing price for ${product.title} - ${variant.title}: ${originalAmount} -> ${correctedAmount} cents`);
            
            updatedPrices.push({
              id: price.id,
              currency_code: price.currency_code,
              amount: correctedAmount,
            });
            
            variantNeedsUpdate = true;
            productNeedsUpdate = true;
            totalPriceUpdates++;
          } else {
            // Keep the price as is
            updatedPrices.push(price);
          }
        }

        if (variantNeedsUpdate) {
          updatedVariants.push({
            id: variant.id,
            title: variant.title,
            sku: (variant as any).sku,
            prices: updatedPrices,
          });
        } else {
          updatedVariants.push(variant);
        }
      }

      if (productNeedsUpdate) {
        try {
          await updateProductsWorkflow(container).run({
            input: {
              products: [{
                id: product.id,
                variants: updatedVariants,
              }],
            },
          });
          
          updatedCount++;
          logger.info(`Updated product: ${product.title}`);
        } catch (error) {
          logger.error(`Error updating product ${product.title}:`, error);
        }
      }
    }

    logger.info(`Price fix completed! Updated ${updatedCount} products with ${totalPriceUpdates} price corrections`);

  } catch (error) {
    logger.error("Error during price fix:", error);
    throw error;
  }
} 