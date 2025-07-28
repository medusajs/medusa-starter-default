import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  batchProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

// CONFIGURATION FOR LARGE DATASETS (1.5M records)
const START_FROM_LINE = 71000; // Start from beginning
const BATCH_SIZE = 1000; // Smaller batches for memory management
const CHUNK_SIZE = 10000; // Process CSV in chunks
const MEMORY_LIMIT = 1500 * 1024 * 1024; // 500MB memory limit
const SKIP_DUPLICATE_CHECKS = false; // Keep checks but optimize them
const REDUCE_LOGGING = true; // Minimal logging for performance
const LOG_INTERVAL = 1000; // Log every 1000 records
const PROGRESS_INTERVAL = 10000; // Detailed progress every 10K records

// Progress tracking interface
interface ProgressState {
  lastProcessedLine: number;
  createdCount: number;
  skippedCount: number;
  timestamp: string;
  totalRecords: number;
  uniqueParts: number;
}

// Memory-efficient part interface
interface LightweightPart {
  part_number: string;
  part_name: string;
  part_amount: number;
  part_discount_code_id: string;
  part_group_id: string;
  part_color_id: string;
  latest_price: number;
  latest_price_date: string;
  price_count: number;
  price_history: string; // JSON string for metadata
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
  const combined = `${partNumber}-${partName}`;
  return combined.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Create record from CSV values
function createRecordFromValues(header: string[], values: string[]): any {
  const record: any = {};
  header.forEach((h, index) => {
    record[h] = values[index] || '';
  });
  return record;
}

// Process a single record and update parts map
function processRecord(record: any, partsMap: Map<string, LightweightPart>): void {
  if (!record.part_number || !record.part_name) {
    return;
  }

  const partNumber = record.part_number.trim();
  const price = parsePrice(record.price_value);
  const createdAt = parseDate(record.price_created_at);
  
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
      latest_price: price,
      latest_price_date: createdAt.toISOString(),
      price_count: 1,
      price_history: JSON.stringify([{
        price,
        created_at: createdAt.toISOString(),
        updated_at: parseDate(record.price_updated_at)?.toISOString() || createdAt.toISOString(),
        deleted: record.price_deleted?.toLowerCase() === 'true'
      }])
    });
  } else {
    const part = partsMap.get(partNumber)!;
    const priceHistory = JSON.parse(part.price_history);
    
    // Add new price entry
    priceHistory.push({
      price,
      created_at: createdAt.toISOString(),
      updated_at: parseDate(record.price_updated_at)?.toISOString() || createdAt.toISOString(),
      deleted: record.price_deleted?.toLowerCase() === 'true'
    });
    
    // Update latest price if this is newer
    if (createdAt > new Date(part.latest_price_date)) {
      part.latest_price = price;
      part.latest_price_date = createdAt.toISOString();
    }
    
    part.price_count = priceHistory.length;
    part.price_history = JSON.stringify(priceHistory);
  }
}

// Save progress to allow resuming from failures
function saveProgress(progress: ProgressState): void {
  try {
    fs.writeFileSync('import-progress-optimized.json', JSON.stringify(progress, null, 2));
  } catch (error) {
    // Ignore save errors
  }
}

// Load progress if exists
function loadProgress(): ProgressState | null {
  try {
    if (fs.existsSync('import-progress-optimized.json')) {
      const data = fs.readFileSync('import-progress-optimized.json', 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Ignore load errors
  }
  return null;
}

// Monitor memory usage during processing
function logMemoryUsage(logger: any): void {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  logger.info(`Memory usage: ${heapUsedMB}MB`);
  
  if (used.heapUsed > MEMORY_LIMIT) {
    logger.warn('Memory usage high, forcing garbage collection');
    global.gc && global.gc();
  }
}

// Process batch with retry logic
async function processBatchWithRetry(
  batch: LightweightPart[], 
  existingSkuSet: Set<string>,
  existingHandleSet: Set<string>,
  defaultSalesChannel: any,
  container: any,
  logger: any,
  retries = 3
): Promise<{ created: number; skipped: number }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await processBatch(batch, existingSkuSet, existingHandleSet, defaultSalesChannel, container, logger);
    } catch (error) {
      if (attempt === retries) {
        logger.error(`Batch failed after ${retries} attempts:`, error);
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      logger.warn(`Retrying batch, attempt ${attempt + 1}/${retries}`);
    }
  }
  return { created: 0, skipped: 0 };
}

// Process a batch of parts
async function processBatch(
  batch: LightweightPart[],
  existingSkuSet: Set<string>,
  existingHandleSet: Set<string>,
  defaultSalesChannel: any,
  container: any,
  logger: any
): Promise<{ created: number; skipped: number }> {
  const productsToCreate: any[] = [];
  let skipped = 0;

  for (const part of batch) {
    try {
      // Check for duplicates using pre-fetched sets
      const handle = generateHandle(part.part_number, part.part_name);
      if (existingSkuSet.has(part.part_number) || existingHandleSet.has(handle)) {
        skipped++;
        continue;
      }

      // Create product data following Medusa patterns
      const productData = {
        title: part.part_number,
        handle: handle,
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
            amount: part.latest_price,
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
            price_history: part.price_history,
            latest_price: part.latest_price,
            latest_price_date: part.latest_price_date,
            total_price_changes: part.price_count
          }
        }],
        metadata: {
          part_number: part.part_number,
          part_group_id: part.part_group_id,
          part_color_id: part.part_color_id,
          total_price_changes: part.price_count,
          import_source: 'parts-csv-import-optimized',
          import_date: new Date().toISOString()
        }
      };

      productsToCreate.push(productData);

    } catch (error) {
      logger.error(`Error preparing product for part ${part.part_number}:`, error.message);
      skipped++;
    }
  }

  if (productsToCreate.length === 0) {
    return { created: 0, skipped };
  }

  try {
    // Use MedusaJS batch-products workflow for efficient processing
    const { result } = await batchProductsWorkflow(container).run({
      input: { create: productsToCreate },
    });

    return { created: result.created.length, skipped };
  } catch (error) {
    logger.error(`Error creating batch:`, error);
    return { created: 0, skipped: skipped + productsToCreate.length };
  }
}

export default async function loadPartsWithPricesOptimized({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("Starting optimized parts import process for 1.5M records...");

  try {
    // Load progress if exists
    const savedProgress = loadProgress();
    let startLine = START_FROM_LINE;
    let createdCount = 0;
    let skippedCount = 0;

    if (savedProgress) {
      logger.info(`Resuming from line ${savedProgress.lastProcessedLine}`);
      startLine = savedProgress.lastProcessedLine;
      createdCount = savedProgress.createdCount;
      skippedCount = savedProgress.skippedCount;
    }

    // Get default sales channel
    const salesChannels = await salesChannelModuleService.listSalesChannels();
    const defaultSalesChannel = salesChannels.find((sc: any) => sc.is_default) || salesChannels[0];

    if (!defaultSalesChannel) {
      logger.error("No sales channel found");
      return;
    }

    // Pre-fetch all existing products ONCE (CRITICAL OPTIMIZATION)
    logger.info("Pre-fetching existing products for duplicate checking...");
    const existingProducts = await productModuleService.listProducts({});
    const existingVariants = await productModuleService.listProductVariants({});

    // Create lookup sets for O(1) access
    const existingSkuSet = new Set(existingVariants.map((v: any) => v.sku));
    const existingHandleSet = new Set(existingProducts.map((p: any) => p.handle));

    logger.info(`Found ${existingProducts.length} existing products and ${existingVariants.length} variants`);

    // Read the CSV file
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
    const partsMap = new Map<string, LightweightPart>();
    const startTime = Date.now();
    
    logger.info(`Starting CSV processing from line ${startLine}...`);

    for await (const line of rl) {
      lineNumber++;
      
      // Skip lines before start line
      if (lineNumber < startLine) continue;
      
      // Parse header
      if (lineNumber === startLine) {
        header = parseCSVLine(line);
        logger.info(`CSV headers: ${header.join(', ')}`);
        continue;
      }
      
      // Process data lines
      const values = parseCSVLine(line);
      if (values.length !== header.length) {
        if (!REDUCE_LOGGING) {
          logger.warn(`Skipping line ${lineNumber} with incorrect number of columns`);
        }
        continue;
      }
      
      // Create record and process immediately
      const record = createRecordFromValues(header, values);
      processRecord(record, partsMap);
      
      // Log progress
      if (lineNumber % LOG_INTERVAL === 0) {
        const elapsed = Date.now() - startTime;
        const rate = lineNumber / (elapsed / 1000);
        logger.info(`Processed ${lineNumber} records, found ${partsMap.size} unique parts, rate: ${rate.toFixed(2)} records/sec`);
        logMemoryUsage(logger);
      }

      // Save progress periodically
      if (lineNumber % PROGRESS_INTERVAL === 0) {
        const progress: ProgressState = {
          lastProcessedLine: lineNumber,
          createdCount,
          skippedCount,
          timestamp: new Date().toISOString(),
          totalRecords: lineNumber,
          uniqueParts: partsMap.size
        };
        saveProgress(progress);
      }
    }

    logger.info(`CSV processing completed. Found ${partsMap.size} unique parts`);

    // Process parts in batches
    const partsArray = Array.from(partsMap.values());
    let processedCount = 0;

    logger.info(`Starting batch processing of ${partsArray.length} parts...`);

    for (let i = 0; i < partsArray.length; i += BATCH_SIZE) {
      const batch = partsArray.slice(i, i + BATCH_SIZE);
      
      logger.info(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(partsArray.length / BATCH_SIZE)} (${batch.length} parts)...`);
      
      const results = await processBatchWithRetry(
        batch, 
        existingSkuSet, 
        existingHandleSet, 
        defaultSalesChannel, 
        container, 
        logger
      );
      
      createdCount += results.created;
      skippedCount += results.skipped;
      processedCount += batch.length;

      // Log batch results
      logger.info(`Batch completed: ${results.created} created, ${results.skipped} skipped. Progress: ${Math.round((processedCount / partsArray.length) * 100)}%`);
      
      // Memory cleanup
      if (i % (BATCH_SIZE * 10) === 0) {
        logMemoryUsage(logger);
        global.gc && global.gc();
      }
    }

    // Final progress save
    const finalProgress: ProgressState = {
      lastProcessedLine: lineNumber,
      createdCount,
      skippedCount,
      timestamp: new Date().toISOString(),
      totalRecords: lineNumber,
      uniqueParts: partsArray.length
    };
    saveProgress(finalProgress);

    // Clean up progress file on successful completion
    try {
      fs.unlinkSync('import-progress-optimized.json');
    } catch (error) {
      // Ignore cleanup errors
    }

    const totalTime = Date.now() - startTime;
    logger.info(`Import completed successfully!`);
    logger.info(`Created: ${createdCount} products`);
    logger.info(`Skipped: ${skippedCount} products`);
    logger.info(`Total parts processed: ${partsArray.length}`);
    logger.info(`Total time: ${Math.round(totalTime / 1000)} seconds`);
    logger.info(`Average rate: ${Math.round(lineNumber / (totalTime / 1000))} records/sec`);

  } catch (error) {
    logger.error("Error during optimized parts import:", error);
    throw error;
  }
} 