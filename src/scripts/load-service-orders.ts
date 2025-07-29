import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules,
} from "@medusajs/framework/utils"
import { SERVICE_ORDERS_MODULE } from "../modules/service-orders"
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

// Helper function to map legacy status to new status enum
function mapLegacyStatus(legacyStatus: string): "draft" | "ready_for_pickup" | "in_progress" | "done" | "returned_for_review" {
  const statusMap: Record<string, "draft" | "ready_for_pickup" | "in_progress" | "done" | "returned_for_review"> = {
    'fase1': 'draft',
    'fase2': 'ready_for_pickup', 
    'fase3': 'in_progress',
    'fase4': 'done',
    'fase5': 'returned_for_review'
  };
  
  return statusMap[legacyStatus.toLowerCase()] || 'draft';
}

// Helper function to map legacy category to service type
function mapServiceType(category: string): "insurance" | "warranty" | "internal" | "standard" | "sales_prep" | "quote" {
  const categoryMap: Record<string, "insurance" | "warranty" | "internal" | "standard" | "sales_prep" | "quote"> = {
    'repair': 'standard',
    'warranty': 'warranty',
    'insurance': 'insurance',
    'maintenance': 'standard',
    'quote': 'quote',
    'internal': 'internal'
  };
  
  return categoryMap[category.toLowerCase()] || 'standard';
}

// Helper function to safely parse dates
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString === 'NaN') return null;
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Helper function to safely parse numbers
function parseNumber(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value || value === 'NaN') return 0;
  
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

// Helper function to safely parse booleans
function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  
  const stringValue = String(value).toLowerCase();
  return stringValue === 'true' || stringValue === '1' || stringValue === 'yes';
}

export default async function loadServiceOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const serviceOrdersService: any = container.resolve(SERVICE_ORDERS_MODULE);
  const customerModuleService = container.resolve(Modules.CUSTOMER);

  logger.info("Starting service orders import process...");

  try {
    // Read the CSV file - expecting service-orders.csv at project root
    const csvPath = path.join(process.cwd(), "service-orders.csv");
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`);
      logger.info("Please place your CSV file at the root of the project as 'service-orders.csv'");
      return;
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(csvContent);

    logger.info(`Found ${records.length} rows in CSV file`);

    if (records.length === 0) {
      logger.warn("No records found in CSV file");
      return;
    }

    // Log sample of columns to help with debugging
    const sampleRecord = records[0];
    logger.info(`CSV columns found: ${Object.keys(sampleRecord).join(', ')}`);

    // Track import statistics
    let serviceOrdersCreated = 0;
    let serviceOrderItemsCreated = 0;
    let serviceOrdersSkipped = 0;
    let errors = 0;

    // Get all customers to map client_id to customer_id
    const customers = await customerModuleService.listCustomers();
    const customerMap = new Map<string, string>();
    
    // Build customer mapping (assuming customers have client_id in metadata)
    for (const customer of customers) {
      if (customer.metadata?.client_id) {
        customerMap.set(String(customer.metadata.client_id), customer.id);
      }
    }

    logger.info(`Found ${customerMap.size} customers for mapping`);

    // Group records by service order number (multiple parts per order)
    const orderGroups = new Map<string, any[]>();
    
    for (const row of records) {
      if (!row.number) continue;
      
      if (!orderGroups.has(row.number)) {
        orderGroups.set(row.number, []);
      }
      orderGroups.get(row.number)!.push(row);
    }

    logger.info(`Found ${orderGroups.size} unique service orders from ${records.length} CSV rows`);

    // Process each service order group
    let processedOrders = 0;
    for (const [orderNumber, orderRows] of orderGroups.entries()) {
      try {
        // Use the first row for the main service order data (all rows should have same order info)
        const mainRow = orderRows[0];
        
        // Skip orders without essential data
        if (!mainRow.description) {
          logger.warn(`Skipping order ${orderNumber} without description`);
          serviceOrdersSkipped++;
          continue;
        }

        // Map customer_id from client_id
        let customer_id: string | null = null;
        if (mainRow.client_id) {
          customer_id = customerMap.get(String(mainRow.client_id)) || null;
          if (!customer_id) {
            logger.warn(`Customer not found for client_id: ${mainRow.client_id} (order ${orderNumber})`);
          }
        }

        // Parse dates
        const defect_date = parseDate(mainRow.defect_date);
        const created_at = parseDate(mainRow.created_at);
        const registered_at_garage = parseDate(mainRow.registered_at_garage);

        // Calculate totals from all rows for this order
        const total_parts_cost = orderRows.reduce((sum, row) => sum + parseNumber(row.part_price) * parseNumber(row.part_quantity), 0);
        const total_labour_cost = parseNumber(mainRow.total_labour_cost) || 0;

        // Map legacy data to service order fields
        const serviceOrderData = {
          // Use legacy number as service order number prefix
          service_order_number: `SO-LEGACY-${orderNumber}`,
          
          // Core fields
          description: mainRow.description || 'Imported legacy service order',
          customer_complaint: mainRow.description || null,
          diagnosis: mainRow.diagnosis || null,
          work_performed: mainRow.comment_worker || null,
          
          // Service details
          service_type: mapServiceType(mainRow.category || ''),
          status: mapLegacyStatus(mainRow.status || ''),
          priority: 'normal' as const,
          service_location: parseBoolean(mainRow.on_location) ? 'customer_location' as const : 'workshop' as const,
          
          // Relationships
          customer_id: customer_id,
          machine_id: mainRow.machine_id || null,
          technician_id: mainRow.assigned_to_worker_id || null,
          
          // Financial data (calculated from all parts)
          labor_rate: parseNumber(mainRow.labour_cost_adjusted) || null,
          total_labor_cost: total_labour_cost,
          total_parts_cost: total_parts_cost,
          total_cost: total_labour_cost + total_parts_cost,
          
          // Scheduling
          scheduled_start_date: defect_date,
          actual_start_date: registered_at_garage,
          
          // Warranty information
          warranty_claim_number: mainRow.warranty_number || null,
          warranty_approved: parseBoolean(mainRow.warranty_number),
          
          // Service characteristics mapped from CSV
          has_appointment: parseBoolean(mainRow.appointment),
          needs_replacement_vehicle: parseBoolean(mainRow.replacement_vehicle),
          includes_minor_maintenance: parseBoolean(mainRow.minor_maintenance),
          includes_major_maintenance: parseBoolean(mainRow.major_maintenance),
          is_repeated_repair: parseBoolean(mainRow.repeated_repair),
          includes_cleaning: parseBoolean(mainRow.washed),
          
          // Additional notes
          internal_notes: [
            mainRow.comment_office,
            mainRow.comment_invoice,
            mainRow.machine_hours ? `Machine hours: ${mainRow.machine_hours}` : null,
            `Imported with ${orderRows.length} part line(s)`
          ].filter(Boolean).join('\n') || null,
          
          customer_notes: mainRow.comment_worker || null,
          
          // System fields
          created_by: "legacy-import",
          updated_by: "legacy-import",
          
          // Store original data in metadata for reference
          metadata: {
            legacy_id: mainRow.id,
            legacy_number: orderNumber,
            legacy_client_name: mainRow.client_name,
            legacy_machine_model: mainRow.machine_model,
            legacy_machine_brand: mainRow.machine_brand,
            legacy_machine_vin: mainRow.machine_vin,
            legacy_status: mainRow.status,
            legacy_category: mainRow.category,
            legacy_printed: parseBoolean(mainRow.printed),
            legacy_invoice_number: mainRow.invoice_number,
            legacy_invoice_id: mainRow.invoice_id,
            legacy_photo: parseBoolean(mainRow.photo),
            original_created_at: mainRow.created_at,
            import_date: new Date().toISOString(),
            total_part_lines: orderRows.length
          }
        };

        // Create the service order using the service
        const serviceOrder = await serviceOrdersService.createServiceOrderWithNumber(serviceOrderData);
        
        logger.info(`Created service order ${serviceOrder.service_order_number} from legacy number ${orderNumber} with ${orderRows.length} part lines`);
        serviceOrdersCreated++;

        // Now create service order items for each part/variant
        for (const [itemIndex, partRow] of orderRows.entries()) {
          try {
            // Only create items for rows that have part information
            if (partRow.part_number || partRow.part_description) {
              const itemData = {
                service_order_id: serviceOrder.id,
                title: partRow.part_description || `Part ${partRow.part_number || itemIndex + 1}`,
                description: partRow.part_number ? `Part Number: ${partRow.part_number}` : null,
                quantity: parseNumber(partRow.part_quantity) || 1,
                unit_price: parseNumber(partRow.part_price) || 0,
                total_amount: (parseNumber(partRow.part_quantity) || 1) * (parseNumber(partRow.part_price) || 0),
                status: "pending" as const,
                metadata: {
                  legacy_part_number: partRow.part_number,
                  legacy_part_brand: partRow.part_brand,
                  legacy_part_description: partRow.part_description,
                  legacy_causal_part_id: partRow.causal_part_id
                }
              };

              await serviceOrdersService.createServiceOrderItems(itemData);
              serviceOrderItemsCreated++;
            }
          } catch (itemError) {
            logger.error(`Error creating item for order ${orderNumber}, part ${itemIndex}: ${itemError.message}`);
            // Continue with other items
          }
        }

        processedOrders++;

        // Log progress every 10 orders
        if (processedOrders % 10 === 0) {
          logger.info(`Processed ${processedOrders}/${orderGroups.size} orders. Created: ${serviceOrdersCreated}, Items: ${serviceOrderItemsCreated}, Skipped: ${serviceOrdersSkipped}, Errors: ${errors}`);
        }

      } catch (error) {
        errors++;
        logger.error(`Error processing order ${orderNumber}: ${error.message}`);
        logger.debug(`Order rows: ${JSON.stringify(orderRows)}`);
        
        // Continue processing other orders
        continue;
      }
    }

    // Final summary
    logger.info(`Service orders import completed!`);
    logger.info(`Summary:`);
    logger.info(`  - Total CSV records processed: ${records.length}`);
    logger.info(`  - Unique service orders created: ${serviceOrdersCreated}`);
    logger.info(`  - Service order items created: ${serviceOrderItemsCreated}`);
    logger.info(`  - Orders skipped: ${serviceOrdersSkipped}`);
    logger.info(`  - Errors: ${errors}`);

    if (errors > 0) {
      logger.warn(`${errors} errors occurred during import. Check logs above for details.`);
    }

  } catch (error) {
    logger.error(`Failed to import service orders: ${error.message}`);
    throw error;
  }
} 