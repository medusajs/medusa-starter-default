import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules
} from "@medusajs/framework/utils"
import {
  deleteProductsWorkflow
} from "@medusajs/medusa/core-flows"

interface PurgeOptions {
  batchSize?: number;
  confirmPurge?: boolean;
  dryRun?: boolean;
}

export default async function purgeProducts({ container }: ExecArgs, options: PurgeOptions = {}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  // Default to confirmed purge for simple execution
  const {
    batchSize = 50,
    confirmPurge = true, // Changed to true by default
    dryRun = false
  } = options;

  logger.info("🚨 PRODUCT PURGE SCRIPT INITIATED");
  logger.info("=====================================");

  if (dryRun) {
    logger.info("🔍 DRY RUN MODE - No data will be deleted");
  } else {
    logger.warn("⚠️  DESTRUCTIVE OPERATION - This will permanently delete ALL products and variants");
    logger.info("🔄 Proceeding with purge operation...");
  }

  try {
    // Get total count first
    const allProducts = await productModuleService.listProducts({}, {
      take: null, // Get all products to count them
      select: ["id", "title", "handle"]
    });

    const totalProducts = allProducts.length;

    if (totalProducts === 0) {
      logger.info("✅ No products found - database is already clean");
      return;
    }

    logger.info(`📊 Found ${totalProducts} products to process`);

    // Get all product variants for additional info
    const allVariants = await productModuleService.listProductVariants({}, {
      take: null,
      select: ["id", "title", "sku", "product_id"]
    });

    logger.info(`📊 Found ${allVariants.length} variants across all products`);

    if (dryRun) {
      logger.info("🔍 DRY RUN - Would delete the following:");
      
      // Show sample of products that would be deleted
      const sampleProducts = allProducts.slice(0, 10);
      for (const product of sampleProducts) {
        const productVariants = allVariants.filter(v => v.product_id === product.id);
        logger.info(`  📦 Product: ${product.title} (${product.handle}) - ${productVariants.length} variants`);
        
        // Show sample variants
        const sampleVariants = productVariants.slice(0, 3);
        for (const variant of sampleVariants) {
          logger.info(`    📋 Variant: ${variant.title} (SKU: ${variant.sku || 'N/A'})`);
        }
        if (productVariants.length > 3) {
          logger.info(`    ... and ${productVariants.length - 3} more variants`);
        }
      }
      
      if (totalProducts > 10) {
        logger.info(`  ... and ${totalProducts - 10} more products`);
      }
      
      logger.info("🔍 DRY RUN COMPLETE - Run with confirmPurge: true to execute deletion");
      return;
    }

    // Actual deletion process
    logger.info("🗑️  Starting deletion process...");

    let deletedCount = 0;
    let errorCount = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      const batchIds = batch.map(p => p.id);

      try {
        logger.info(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)} (${batch.length} products)...`);

        // Delete products using Medusa workflow
        await deleteProductsWorkflow(container).run({
          input: { ids: batchIds }
        });

        deletedCount += batch.length;

        // Log some sample deletions
        const sampleBatch = batch.slice(0, 3);
        for (const product of sampleBatch) {
          logger.info(`  ✅ Deleted: ${product.title} (${product.handle})`);
        }
        if (batch.length > 3) {
          logger.info(`  ✅ ... and ${batch.length - 3} more products in this batch`);
        }

        // Progress update
        const progress = Math.round((deletedCount / totalProducts) * 100);
        logger.info(`📈 Progress: ${deletedCount}/${totalProducts} products deleted (${progress}%)`);

      } catch (error) {
        logger.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errorCount += batch.length;

        // Try to delete products individually to identify problematic ones
        for (const product of batch) {
          try {
            await deleteProductsWorkflow(container).run({
              input: { ids: [product.id] }
            });
            deletedCount++;
            logger.info(`  ✅ Individual delete succeeded: ${product.title}`);
          } catch (individualError) {
            logger.error(`  ❌ Individual delete failed for ${product.title}: ${individualError.message}`);
            errorCount++;
          }
        }
      }
    }

    // Final summary
    logger.info("🎉 PURGE OPERATION COMPLETED");
    logger.info("============================");
    logger.info(`✅ Successfully deleted: ${deletedCount} products`);
    if (errorCount > 0) {
      logger.warn(`❌ Failed to delete: ${errorCount} products`);
    }
    logger.info(`📊 Total processed: ${totalProducts} products`);
    
    // Verify cleanup
    const remainingProducts = await productModuleService.listProducts({}, {
      take: 10,
      select: ["id", "title"]
    });

    if (remainingProducts.length === 0) {
      logger.info("✅ VERIFICATION: Database is now clean - no products remaining");
    } else {
      logger.warn(`⚠️  VERIFICATION: ${remainingProducts.length} products still remain (this might be expected if some failed to delete)`);
    }

  } catch (error) {
    logger.error("💥 Fatal error during purge operation:", error);
    throw error;
  }
}

// Export types for external usage
export type { PurgeOptions };