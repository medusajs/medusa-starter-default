import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

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

// Create record from CSV values
function createRecordFromValues(header: string[], values: string[]): any {
  const record: any = {};
  header.forEach((h, index) => {
    record[h] = values[index] || '';
  });
  return record;
}

export default async function debugCsvStructure({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Starting CSV structure debug...");

  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), "parts-prices.csv");
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`);
      return;
    }

    // Stream processing to check structure
    const fileStream = createReadStream(csvPath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let header: string[] = [];
    let sampleRecords: any[] = [];
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;

    for await (const line of rl) {
      lineNumber++;
      
      // Parse header
      if (lineNumber === 1) {
        header = parseCSVLine(line);
        logger.info(`CSV headers found: ${header.join(', ')}`);
        logger.info(`Number of columns: ${header.length}`);
        continue;
      }
      
      // Process first 10 data lines for analysis
      if (lineNumber <= 11) {
        const values = parseCSVLine(line);
        if (values.length !== header.length) {
          logger.warn(`Line ${lineNumber}: Incorrect column count. Expected ${header.length}, got ${values.length}`);
          logger.warn(`Line content: ${line.substring(0, 100)}...`);
          invalidRecords++;
          continue;
        }
        
        const record = createRecordFromValues(header, values);
        sampleRecords.push(record);
        
        // Log the first few records for analysis
        if (lineNumber <= 6) {
          logger.info(`Sample record ${lineNumber - 1}:`);
          logger.info(`  part_number: "${record.part_number}"`);
          logger.info(`  part_name: "${record.part_name}"`);
          logger.info(`  price_value: "${record.price_value}"`);
          logger.info(`  price_created_at: "${record.price_created_at}"`);
          logger.info(`  All fields: ${JSON.stringify(record)}`);
        }
      }
      
      // Count total records
      totalRecords++;
      
      // Check if this is a valid record
      const values = parseCSVLine(line);
      if (values.length === header.length) {
        validRecords++;
      } else {
        invalidRecords++;
      }
      
      // Stop after checking first 1000 lines for analysis
      if (lineNumber > 1000) {
        break;
      }
    }

    logger.info(`=== CSV ANALYSIS RESULTS ===`);
    logger.info(`Total lines processed: ${lineNumber}`);
    logger.info(`Valid records: ${validRecords}`);
    logger.info(`Invalid records: ${invalidRecords}`);
    logger.info(`Sample records collected: ${sampleRecords.length}`);
    
    // Check for required fields
    const requiredFields = ['part_number', 'part_name', 'price_value', 'price_created_at'];
    const missingFields = requiredFields.filter(field => !header.includes(field));
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields: ${missingFields.join(', ')}`);
      logger.error(`Available fields: ${header.join(', ')}`);
    } else {
      logger.info(`All required fields found in headers`);
    }
    
    // Check sample records for data quality
    logger.info(`=== SAMPLE RECORD ANALYSIS ===`);
    sampleRecords.forEach((record, index) => {
      logger.info(`Record ${index + 1}:`);
      logger.info(`  Has part_number: ${!!record.part_number}`);
      logger.info(`  Has part_name: ${!!record.part_name}`);
      logger.info(`  Has price_value: ${!!record.price_value}`);
      logger.info(`  Has price_created_at: ${!!record.price_created_at}`);
      logger.info(`  part_number value: "${record.part_number}"`);
      logger.info(`  part_name value: "${record.part_name}"`);
      logger.info(`  price_value value: "${record.price_value}"`);
      logger.info(`  price_created_at value: "${record.price_created_at}"`);
    });

  } catch (error) {
    logger.error("Error during CSV structure debug:", error);
    throw error;
  }
} 