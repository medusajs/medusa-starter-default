import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import * as fs from "fs";
import * as path from "path";

// Simple CSV parser for comma-separated values with proper quote handling
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export default async function importCsvProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  logger.info("Starting CSV import process...");
  
  // Get default sales channel
  const salesChannels = await salesChannelModuleService.listSalesChannels();
  const defaultSalesChannel = salesChannels.find((sc: any) => sc.is_default) || salesChannels[0];

  if (!defaultSalesChannel) {
    logger.error("No sales channel found");
    return;
  }

  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), "Medusa_products_1.csv");
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`);
      return;
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(csvContent);

    logger.info(`Found ${records.length} rows in CSV file`);

    // Process products in batches
    const batchSize = 100;
    let processedCount = 0;
    let createdCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const productsToCreate: any[] = [];

      for (const row of batch) {
        // Skip rows without product title
        if (!row['Product Title']) {
          continue;
        }

        // Generate handle from title
        const handle = row['Product Title'].toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        // Create product data following Medusa patterns
        const productData = {
          title: row['Product Title'],
          handle,
          status: row['Product Status'] || ProductStatus.DRAFT,
          description: row['Product Description'] || undefined,
          sales_channels: [{ id: defaultSalesChannel.id }],
          options: [{
            title: "Default Option",
            values: ["Default Option Value"]
          }],
          variants: [{
            title: 'Default',
            sku: row['Variant SKU'] || undefined,
            prices: [
              row['Variant Price EUR'] && {
                currency_code: 'eur',
                amount: Math.round(parseFloat(row['Variant Price EUR']) * 100),
              },
              row['Variant Price USD'] && {
                currency_code: 'usd',
                amount: Math.round(parseFloat(row['Variant Price USD']) * 100),
              }
            ].filter(Boolean),
            options: {
              "Default Option": "Default Option Value"
            },
          }]
        };

        productsToCreate.push(productData);
      }

      if (productsToCreate.length === 0) {
        continue;
      }

      try {
        logger.info(`Creating batch ${Math.floor(i / batchSize) + 1} with ${productsToCreate.length} products...`);
        
        const { result } = await createProductsWorkflow(container).run({
          input: { products: productsToCreate },
        });

        createdCount += result.length;
        processedCount += batch.length;

        logger.info(`Created ${result.length} products. Progress: ${Math.round((processedCount / records.length) * 100)}%`);

      } catch (error) {
        logger.error(`Error creating batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    logger.info(`Import completed! Created ${createdCount} products from ${processedCount} rows`);

  } catch (error) {
    logger.error("Error during CSV import:", error);
    throw error;
  }
} 