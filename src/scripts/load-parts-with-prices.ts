import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"

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

// Helper function to parse date strings
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === '') return null;
  
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Ignore
  }
  
  return null;
}

// Helper function to parse price values
function parsePrice(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

// Helper function to generate handle from part name
function generateHandle(partNumber: string, partName: string): string {
  const baseHandle = `${partNumber}-${partName}`.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return baseHandle.substring(0, 100); // Limit handle length
}

interface PartData {
  part_number: string;
  part_name: string;
  part_amount: string;
  part_discount_code_id: string;
  part_group_id: string;
  part_color_id: string;
  price_value: string;
  price_deleted: string;
  price_created_at: string;
  price_updated_at: string;
}

interface PriceHistoryEntry {
  price: number;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
}

interface GroupedPart {
  part_number: string;
  part_name: string;
  part_amount: number;
  part_discount_code_id: string;
  part_group_id: string;
  part_color_id: string;
  priceHistory: PriceHistoryEntry[];
}

export default async function loadPartsWithPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("Starting parts with price history import process...");

  try {
    // Get default sales channel
    const salesChannels = await salesChannelModuleService.listSalesChannels();
    const defaultSalesChannel = salesChannels.find((sc: any) => sc.is_default) || salesChannels[0];

    if (!defaultSalesChannel) {
      logger.error("No sales channel found");
      return;
    }

    // Read the CSV file - update this path to match your CSV file location
    const csvPath = path.join(process.cwd(), "parts-prices.csv");
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`);
      logger.info("Please place your CSV file at the root of the project as 'parts-prices.csv'");
      return;
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(csvContent) as PartData[];

    logger.info(`Found ${records.length} price records in CSV file`);

    // Group records by part_number to consolidate price history
    const partsMap = new Map<string, GroupedPart>();

    for (const record of records) {
      if (!record.part_number || !record.part_name) {
        logger.warn(`Skipping record without part_number or part_name: ${JSON.stringify(record)}`);
        continue;
      }

      const partNumber = record.part_number.trim();
      const price = parsePrice(record.price_value);
      const createdAt = parseDate(record.price_created_at);
      const updatedAt = parseDate(record.price_updated_at);
      
      if (price === null || !createdAt) {
        logger.warn(`Skipping record with invalid price or date: ${JSON.stringify(record)}`);
        continue;
      }

      if (!partsMap.has(partNumber)) {
        partsMap.set(partNumber, {
          part_number: partNumber,
          part_name: record.part_name.trim(),
          part_amount: parseFloat(record.part_amount) || 1.0,
          part_discount_code_id: record.part_discount_code_id?.trim() || '',
          part_group_id: record.part_group_id?.trim() || '',
          part_color_id: record.part_color_id?.trim() || '',
          priceHistory: []
        });
      }

      const part = partsMap.get(partNumber)!;
      part.priceHistory.push({
        price,
        created_at: createdAt,
        updated_at: updatedAt || createdAt,
        deleted: record.price_deleted?.toLowerCase() === 'true'
      });
    }

    logger.info(`Grouped into ${partsMap.size} unique parts`);

    // Sort price history by created_at for each part
    for (const part of partsMap.values()) {
      part.priceHistory.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    }

    // Process parts in batches
    const batchSize = 50;
    const partsArray = Array.from(partsMap.values());
    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < partsArray.length; i += batchSize) {
      const batch = partsArray.slice(i, i + batchSize);
      const productsToCreate: any[] = [];

      for (const part of batch) {
        try {
          // Check if product already exists by SKU (part_number)
          const existingProducts = await productModuleService.listProducts({
            handle: generateHandle(part.part_number, part.part_name)
          });

          if (existingProducts.length > 0) {
            logger.info(`Product already exists for part ${part.part_number}, skipping...`);
            skippedCount++;
            continue;
          }

          // Get the latest non-deleted price
          const activePrices = part.priceHistory.filter(p => !p.deleted);
          const latestPrice = activePrices.length > 0 ? activePrices[activePrices.length - 1] : part.priceHistory[part.priceHistory.length - 1];
          
          if (!latestPrice) {
            logger.warn(`No price found for part ${part.part_number}, skipping...`);
            skippedCount++;
            continue;
          }

          // Convert price to cents (Medusa stores prices in smallest currency unit)
          const priceInCents = Math.round(latestPrice.price * 100);

          // Create product data following Medusa patterns
          const productData = {
            title: `${part.part_name} (${part.part_number})`,
            handle: generateHandle(part.part_number, part.part_name),
            status: ProductStatus.PUBLISHED,
            description: `Part Number: ${part.part_number}\nQuantity: ${part.part_amount}`,
            sales_channels: [{ id: defaultSalesChannel.id }],
            options: [{
              title: "Default Option",
              values: ["Default Option Value"]
            }],
            variants: [{
              title: part.part_name,
              sku: part.part_number,
              prices: [{
                currency_code: 'eur',
                amount: priceInCents,
              }],
              options: {
                "Default Option": "Default Option Value"
              },
              manage_inventory: true,
              allow_backorder: false,
              weight: null,
              length: null,
              height: null,
              width: null,
              hs_code: null,
              origin_country: null,
              material: null,
              metadata: {
                part_amount: part.part_amount,
                part_discount_code_id: part.part_discount_code_id,
                part_group_id: part.part_group_id,
                part_color_id: part.part_color_id,
                price_history: JSON.stringify(part.priceHistory.map(p => ({
                  price: p.price,
                  created_at: p.created_at.toISOString(),
                  updated_at: p.updated_at.toISOString(),
                  deleted: p.deleted
                }))),
                latest_price: latestPrice.price,
                latest_price_date: latestPrice.created_at.toISOString()
              }
            }],
            metadata: {
              part_number: part.part_number,
              part_group_id: part.part_group_id,
              part_color_id: part.part_color_id,
              total_price_changes: part.priceHistory.length,
              import_source: 'parts-csv-import',
              import_date: new Date().toISOString()
            }
          };

          productsToCreate.push(productData);

        } catch (error) {
          logger.error(`Error preparing product for part ${part.part_number}:`, error.message);
          skippedCount++;
        }
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

        logger.info(`Created ${result.length} products. Progress: ${Math.round((processedCount / partsArray.length) * 100)}%`);

        // Log some sample products created
        if (result.length > 0) {
          const sampleProducts = result.slice(0, 3);
          for (const product of sampleProducts) {
            logger.info(`  ✓ Created: ${product.title} (Handle: ${product.handle})`);
          }
        }

      } catch (error) {
        logger.error(`Error creating batch ${Math.floor(i / batchSize) + 1}:`, error);
        
        // Try to create products individually to identify problematic ones
        for (const productData of productsToCreate) {
          try {
            const { result } = await createProductsWorkflow(container).run({
              input: { products: [productData] },
            });
            createdCount += result.length;
            logger.info(`  ✓ Individual create succeeded: ${productData.title}`);
          } catch (individualError) {
            logger.error(`  ✗ Individual create failed for ${productData.title}:`, individualError.message);
            skippedCount++;
          }
        }
      }
    }

    logger.info(`Import completed!`);
    logger.info(`Created: ${createdCount} products`);
    logger.info(`Skipped: ${skippedCount} products`);
    logger.info(`Total parts processed: ${partsArray.length}`);
    
    // Log summary statistics
    const totalPriceRecords = Array.from(partsMap.values()).reduce((sum, part) => sum + part.priceHistory.length, 0);
    const avgPriceChanges = totalPriceRecords / partsArray.length;
    logger.info(`Average price changes per part: ${avgPriceChanges.toFixed(1)}`);

  } catch (error) {
    logger.error("Error during parts import:", error);
    throw error;
  }
} 