import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";
import * as fs from "fs";
import * as path from "path";

// Simple CSV parser function with configurable separator
function parseCSV(csvContent: string, separator: string = ','): any[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(separator);
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(separator);
    const row: any = {};
    
    headers.forEach((header, index) => {
      // Clean header by removing quotes and trimming
      const cleanHeader = header.trim().replace(/^"(.*)"$/, '$1');
      // Clean value by removing quotes and trimming
      const cleanValue = values[index] ? values[index].trim().replace(/^"(.*)"$/, '$1') : '';
      row[cleanHeader] = cleanValue;
    });
    
    rows.push(row);
  }
  
  return rows;
}

export default async function importCsvProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  logger.info("Starting CSV import process...");
  
  // Performance optimization: Pre-fetch required data once
  logger.info("Pre-fetching required data...");
  const [salesChannels, fulfillmentSets] = await Promise.all([
    salesChannelModuleService.listSalesChannels(),
    fulfillmentModuleService.listFulfillmentSets()
  ]);
  
  const defaultSalesChannel = salesChannels.find((sc: any) => sc.is_default) || salesChannels[0];
  const defaultFulfillmentSet = fulfillmentSets[0];

  if (!defaultSalesChannel) {
    logger.error("No sales channel found");
    return;
  }

  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), "Medusa_products_1.csv");
    const separator = ',';
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`);
      return;
    }

    // Read CSV with proper encoding handling
    let csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    
    // Clean up problematic characters that might cause JavaScript parsing issues
    // This is more selective - only removes characters that could cause ReferenceError
    csvContent = csvContent.replace(/[^\u0000-\u007F\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, function(char) {
      logger.warn(`Replacing problematic character: ${char} (code: ${char.charCodeAt(0)})`);
      return ''; // Remove the character
    });
    
    const rows = parseCSV(csvContent, separator);

    logger.info(`Found ${rows.length} rows in CSV file`);

    // Process products in batches - increased for better performance
    const batchSize = 5000; // Increased from 10 to 100 for better throughput
    let processedCount = 0;
    let createdCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const productsToCreate: any[] = [];

      for (const row of batch) {
        // Skip rows without product title
        if (!row['Product Title']) {
          logger.warn(`Skipping row without Product Title: ${JSON.stringify(row)}`);
          continue;
        }

        // Generate handle from title if not provided
        const handle = row['Product Handle'] || 
          row['Product Title'].toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        // Skip duplicate check for performance - we'll let Medusa handle duplicates
        // This saves a database query per product

        // Build product options and variant options
        // According to https://github.com/medusajs/medusa/issues/9632, 
        // Medusa v2 requires product options even for simple products
        const hasOptions = row['Variant Option 1 Name'] && row['Variant Option 1 Value'];
        
        const productOptions = hasOptions ? [{
          title: row['Variant Option 1 Name'],
          values: [row['Variant Option 1 Value']]
        }] : [{
          title: "Default Option",
          values: ["Default Option Value"]
        }];

        const variantOptions = hasOptions ? {
          [row['Variant Option 1 Name']]: row['Variant Option 1 Value']
        } : {
          "Default Option": "Default Option Value"
        };

        const productData = {
          title: row['Product Title'],
          handle,
          subtitle: row['Product Subtitle'] || undefined,
          description: row['Product Description'] || undefined,
          status: (row['Product Status'] as ProductStatus) || ProductStatus.DRAFT,
          discountable: row['Product Discountable'] === 'TRUE',
          weight: row['Product Weight'] ? parseFloat(row['Product Weight']) : undefined,
          length: row['Product Length'] ? parseFloat(row['Product Length']) : undefined,
          width: row['Product Width'] ? parseFloat(row['Product Width']) : undefined,
          height: row['Product Height'] ? parseFloat(row['Product Height']) : undefined,
          hs_code: row['Product HS Code'] || undefined,
          origin_country: row['Product Origin Country'] || undefined,
          mid_code: row['Product MID Code'] || undefined,
          material: row['Product Material'] || undefined,
          external_id: row['Product External Id'] || undefined,
          thumbnail: row['Product Thumbnail'] || undefined,
          images: [
            row['Product Image 1 Url'],
            row['Product Image 2 Url']
          ].filter(Boolean).map(url => ({ url })),
          sales_channels: [{ id: defaultSalesChannel.id }],
          options: productOptions,
          variants: [{
            title: row['Variant Title'] || 'Default',
            sku: row['Variant SKU'] || undefined,
            barcode: row['Variant Barcode'] || undefined,
            allow_backorder: row['Variant Allow Backorder'] === 'TRUE',
            manage_inventory: row['Variant Manage Inventory'] === 'TRUE',
            weight: row['Variant Weight'] ? parseFloat(row['Variant Weight']) : undefined,
            length: row['Variant Length'] ? parseFloat(row['Variant Length']) : undefined,
            width: row['Variant Width'] ? parseFloat(row['Variant Width']) : undefined,
            height: row['Variant Height'] ? parseFloat(row['Variant Height']) : undefined,
            hs_code: row['Variant HS Code'] || undefined,
            origin_country: row['Variant Origin Country'] || undefined,
            mid_code: row['Variant MID Code'] || undefined,
            material: row['Variant Material'] || undefined,
            prices: [
              row['Variant Price EUR'] && {
                currency_code: 'eur',
                amount: Math.round(parseFloat(row['Variant Price EUR']) * 100), // Convert to cents
              },
              row['Variant Price USD'] && {
                currency_code: 'usd',
                amount: Math.round(parseFloat(row['Variant Price USD']) * 100), // Convert to cents
              }
            ].filter(Boolean),
            options: variantOptions,
          }]
        };

        productsToCreate.push(productData);
      }

      if (productsToCreate.length === 0) {
        logger.info(`No new products to create in batch ${Math.floor(i / batchSize) + 1}`);
        continue;
      }

      try {
        logger.info(`Creating batch ${Math.floor(i / batchSize) + 1} with ${productsToCreate.length} products...`);
        
        const { result } = await createProductsWorkflow(container).run({
          input: { products: productsToCreate },
        });

        createdCount += result.length;
        processedCount += batch.length;

        logger.info(`Created ${result.length} products in batch ${Math.floor(i / batchSize) + 1}`);
        logger.info(`Progress: ${Math.round((processedCount / rows.length) * 100)}% complete (${processedCount}/${rows.length} rows)`);

        // Skip inventory creation for performance - can be done separately if needed
        // This saves significant time per batch

      } catch (error) {
        logger.error(`Error creating products in batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch
      }
    }

    logger.info(`CSV import completed! Processed ${processedCount} rows, created ${createdCount} products`);
    logger.info(`Success rate: ${((createdCount / processedCount) * 100).toFixed(2)}%`);

  } catch (error) {
    logger.error("Error during CSV import:", error);
    throw error;
  }
} 