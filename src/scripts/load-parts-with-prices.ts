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
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// CONFIGURATION: Set the line number to start processing from (1-based, includes header)
// Set to 1 to start from the beginning, or any line number to resume from that point
const START_FROM_LINE = 71000;

// PERFORMANCE CONFIGURATION
const BATCH_SIZE = 1000; // Revert to proven batch size that works well
const SKIP_DUPLICATE_CHECKS = false; // Re-enable duplicate checks (safer)
const REDUCE_LOGGING = true; // Keep reduced logging for better performance
const MEMORY_LIMIT = 1024 * 1024 * 1024; // 1GB memory limit

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
  // Combine part number and name
  const combined = `${partNumber}-${partName}`;
  
  // Convert to lowercase and replace spaces with dashes
  let handle = combined.toLowerCase();
  
  // Replace all non-alphanumeric characters (except existing dashes) with dashes
  // This includes special characters, symbols, and accented characters
  handle = handle.replace(/[^a-z0-9-]/g, '-');
  
  // Replace multiple consecutive dashes with single dash
  handle = handle.replace(/-+/g, '-');
  
  // Remove leading and trailing dashes
  handle = handle.replace(/^-+|-+$/g, '');
  
  // Ensure minimum length (if empty after cleaning, use part number)
  if (!handle || handle.length === 0) {
    handle = partNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  
  // If still empty, generate a basic handle
  if (!handle || handle.length === 0) {
    handle = `product-${Date.now()}`;
  }
  
  // Limit handle length to 80 characters (Medusa best practice)
  // Leave some room for potential suffixes if duplicates exist
  if (handle.length > 80) {
    handle = handle.substring(0, 80);
    // Remove trailing dash if truncation created one
    handle = handle.replace(/-+$/, '');
  }
  
  // Final safety check: ensure it doesn't end with a dash
  handle = handle.replace(/-+$/, '');
  
  // Final fallback if somehow still invalid
  if (!handle || handle.length === 0 || !/^[a-z0-9]/.test(handle)) {
    handle = `part-${partNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }
  
  return handle;
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

// Helper function to create record from CSV values
function createRecordFromValues(headers: string[], values: string[]): PartData {
  const record: any = {};
  headers.forEach((header, index) => {
    record[header] = values[index] || '';
  });
  return record as PartData;
}

// Helper function to process a single record
function processRecord(record: PartData, partsMap: Map<string, GroupedPart>) {
  if (!record.part_number || !record.part_name) {
    return;
  }

  const partNumber = record.part_number.trim();
  const price = parsePrice(record.price_value);
  const createdAt = parseDate(record.price_created_at);
  const updatedAt = parseDate(record.price_updated_at);
  
  if (price === null || !createdAt) {
    return;
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

// Monitor memory usage during processing
function logMemoryUsage(logger: any) {
  const used = process.memoryUsage();
  logger.info(`Memory usage: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
  
  if (used.heapUsed > MEMORY_LIMIT) {
    logger.warn('Memory usage high, forcing garbage collection');
    global.gc && global.gc();
  }
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

    // Stream processing instead of loading entire file
    const fileStream = createReadStream(csvPath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let header: string[] = [];
    const partsMap = new Map<string, GroupedPart>();
    
    for await (const line of rl) {
      lineNumber++;
      
      // Skip lines before START_FROM_LINE
      if (lineNumber < START_FROM_LINE) continue;
      
      // Parse header
      if (lineNumber === START_FROM_LINE) {
        header = parseCSVLine(line);
        continue;
      }
      
      // Process data lines
      const values = parseCSVLine(line);
      if (values.length !== header.length) continue;
      
      // Create record and process immediately
      const record = createRecordFromValues(header, values);
      processRecord(record, partsMap);
      
      // Log progress every 10,000 records
      if (lineNumber % 10000 === 0) {
        logger.info(`Processed ${lineNumber - START_FROM_LINE} records, found ${partsMap.size} unique parts`);
        logMemoryUsage(logger);
      }
    }

    logger.info(`Found ${partsMap.size} unique parts in CSV file`);

    // Sort price history by created_at for each part
    for (const part of partsMap.values()) {
      part.priceHistory.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    }

    // Process parts in batches
    const batchSize = BATCH_SIZE;
    const partsArray = Array.from(partsMap.values());
    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < partsArray.length; i += batchSize) {
      const batch = partsArray.slice(i, i + batchSize);
      const productsToCreate: any[] = [];

      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(partsArray.length / batchSize)} (${batch.length} parts)...`);

      for (const part of batch) {
        try {
          // Check if product already exists by SKU (part_number) OR handle
          if (!SKIP_DUPLICATE_CHECKS) {
            const existingProductsBySku = await productModuleService.listProductVariants({
              sku: part.part_number
            });

            const existingProductsByHandle = await productModuleService.listProducts({
              handle: generateHandle(part.part_number, part.part_name)
            });

            if (existingProductsBySku.length > 0 || existingProductsByHandle.length > 0) {
              if (!REDUCE_LOGGING) {
                logger.info(`Product already exists for part ${part.part_number} (SKU or handle match), skipping...`);
              }
              skippedCount++;
              continue;
            }
          }

          // Get the latest non-deleted price
          const activePrices = part.priceHistory.filter(p => !p.deleted);
          const latestPrice = activePrices.length > 0 ? activePrices[activePrices.length - 1] : part.priceHistory[part.priceHistory.length - 1];
          
          if (!latestPrice) {
            logger.warn(`No price found for part ${part.part_number}, skipping...`);
            skippedCount++;
            continue;
          }

          // Use price as-is (Medusa stores prices in main currency unit, not cents)
          const priceAmount = latestPrice.price;

          // Create product data following Medusa patterns
          const productData = {
            title: part.part_number,
            handle: generateHandle(part.part_number, part.part_name),
            status: ProductStatus.PUBLISHED,
            description: part.part_name,
            sales_channels: [{ id: defaultSalesChannel.id }],
            options: [{
              title: "Type",
              values: ["Standard"]
            }],
            variants: [{
              title: part.part_name,
              sku: part.part_number,
              prices: [{
                currency_code: 'eur',
                amount: priceAmount,
              }],
              options: {
                "Type": "Standard"
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

        // Log some sample products created (reduced logging)
        if (!REDUCE_LOGGING && result.length > 0) {
          const sampleProducts = result.slice(0, 2); // Reduce sample size
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
            if (!REDUCE_LOGGING) {
              logger.info(`  ✓ Individual create succeeded: ${productData.title}`);
            }
          } catch (individualError) {
            logger.error(`  ✗ Individual create failed for ${productData.title}:`, individualError);
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