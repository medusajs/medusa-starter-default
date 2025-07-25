import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules,
} from "@medusajs/framework/utils"
import { createMachineWorkflow } from "../modules/machines/workflows/create-machine"
import { createCustomersWorkflow } from "@medusajs/medusa/core-flows"
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
  
  // Try different date formats
  const dateFormats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY/MM/DD'
  ];
  
  for (const format of dateFormats) {
    try {
      // Simple date parsing - you might want to use a library like date-fns for more robust parsing
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// Helper function to parse numbers
function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

// Helper function to validate and normalize machine status
function normalizeStatus(status: string): "active" | "inactive" | "maintenance" | "sold" {
  const normalizedStatus = status?.toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'inactive':
    case 'disabled':
    case 'out_of_service':
      return 'inactive';
    case 'maintenance':
    case 'repair':
    case 'service':
      return 'maintenance';
    case 'sold':
    case 'disposed':
      return 'sold';
    case 'active':
    case 'operational':
    case 'available':
    default:
      return 'active';
  }
}

export default async function loadCustomersMachines({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const customerModuleService = container.resolve(Modules.CUSTOMER);

  logger.info("Starting customers and machines import process...");

  try {
    // Read the CSV file - update this path to match your CSV file location
    const csvPath = path.join(process.cwd(), "customers-machines.csv");
    
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found at: ${csvPath}`);
      logger.info("Please place your CSV file at the root of the project as 'customers-machines.csv'");
      return;
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(csvContent);

    logger.info(`Found ${records.length} rows in CSV file`);

    // Track created customers and machines
    const customerMap = new Map<string, string>(); // client_id -> customer_id
    const processedMachines = new Set<string>(); // track processed machine serial numbers
    let customersCreated = 0;
    let machinesCreated = 0;
    let customersSkipped = 0;
    let machinesSkipped = 0;
    let errors = 0;

    // Group machines by customer to optimize batch processing
    const machinesByCustomer = new Map<string, any[]>();

    // First pass: Process customers and group machines
    for (const row of records) {
      try {
        // Skip rows without essential data
        if (!row.client_id || !row.machine_id) {
          logger.warn(`Skipping row without client_id or machine_id: ${JSON.stringify(row)}`);
          continue;
        }

        // Process Customer
        let customerId = customerMap.get(row.client_id);
        
        if (!customerId) {
          try {
            // Check if customer already exists by email
            const existingCustomers = await customerModuleService.listCustomers({
              email: row.email
            });

            if (existingCustomers.length > 0) {
              customerId = existingCustomers[0].id;
              customerMap.set(row.client_id, customerId);
              logger.info(`Found existing customer: ${row.email}`);
            } else {
              // Use createCustomersWorkflow for proper customer creation
              const { result } = await createCustomersWorkflow(container).run({
                input: {
                  customersData: [{
                    email: row.email || `customer-${row.client_id}@example.com`,
                    first_name: row.name?.split(' ')[0] || `Customer ${row.client_id}`,
                    last_name: row.name?.split(' ').slice(1).join(' ') || '',
                    phone: row.phone || row.mobile || null,
                    company_name: row.name || null,
                    addresses: [{
                      first_name: row.name?.split(' ')[0] || `Customer ${row.client_id}`,
                      last_name: row.name?.split(' ').slice(1).join(' ') || '',
                      address_1: row.street || '',
                      address_2: row.house_number || '',
                      city: row.city || '',
                      postal_code: row.zip_code || '',
                      country_code: row.country?.toLowerCase() || 'be',
                      phone: row.phone || row.mobile || null,
                    }],
                    metadata: {
                      client_id: row.client_id,
                      adsolut_id: row.adsolut_id,
                      vat: row.vat,
                      fax: row.fax,
                      mobile: row.mobile,
                      created_at_original: row.created_at,
                      updated_at_original: row.updated_at,
                    }
                  }]
                }
              });

              customerId = result[0].id;
              customerMap.set(row.client_id, customerId);
              customersCreated++;
              logger.info(`Created customer: ${result[0].email} (${result[0].first_name} ${result[0].last_name})`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('unique') || errorMessage.includes('already exists')) {
              logger.warn(`Customer with email ${row.email} already exists, skipping...`);
              customersSkipped++;
            } else {
              logger.error(`Error creating customer for client_id ${row.client_id}:`, error);
              errors++;
            }
            continue;
          }
        }

        // Group machine data by customer for batch processing
        if (!machinesByCustomer.has(customerId)) {
          machinesByCustomer.set(customerId, []);
        }
        
        // Skip if we've already processed this machine
        const machineSerial = row.vin || row.machine_id;
        if (processedMachines.has(machineSerial)) {
          logger.info(`Machine ${machineSerial} already processed, skipping...`);
          machinesSkipped++;
          continue;
        }

        machinesByCustomer.get(customerId)!.push({
          row,
          machineData: {
            model_number: row.model || row.category || 'Unknown Model',
            serial_number: machineSerial,
            license_plate: row.license_plate || null,
            year: parseNumber(row.build_date) || parseNumber(row.year) || null,
            engine_hours: parseNumber(row.tlm) || null,
            status: normalizeStatus(row.rental === 'true' ? 'active' : 'active'), // Proper status enum
            customer_id: customerId,
            description: row.machine_description || row.comment || null,
            notes: row.work_needed || row.comment || null,
            metadata: {
              machine_id: row.machine_id,
              id_machine: row.id_machine,
              category: row.category,
              brand: row.brand,
              rental: row.rental === 'true',
              maintenance: row.maintenance === 'true',
              build_date: row.build_date,
              delivery_date: row.delivery_date,
              tlm: row.tlm,
              created_at_original: row.created_at_machine,
              updated_at_original: row.updated_at_machine,
            }
          }
        });

      } catch (error) {
        logger.error(`Error processing row:`, error);
        errors++;
        continue;
      }
    }

    // Second pass: Create machines using workflows in batches
    for (const [customerId, machineDataList] of machinesByCustomer) {
      try {
        if (machineDataList.length === 0) continue;

        logger.info(`Processing ${machineDataList.length} machines for customer ${customerId}`);

        // Use createMachineWorkflow for proper machine creation
        const workflowResult = await createMachineWorkflow(container).run({
          input: {
            machines: machineDataList.map(item => item.machineData)
          }
        });

        const { result } = workflowResult;
        const createdMachines = (result as any).machines;

        // Mark machines as processed
        machineDataList.forEach(item => {
          processedMachines.add(item.machineData.serial_number);
        });

        machinesCreated += Array.isArray(createdMachines) ? createdMachines.length : 0;
        logger.info(`Successfully created ${Array.isArray(createdMachines) ? createdMachines.length : 0} machines for customer ${customerId}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('unique') || errorMessage.includes('already exists')) {
          logger.warn(`Some machines for customer ${customerId} already exist, skipping batch...`);
          machinesSkipped += machineDataList.length;
        } else {
          logger.error(`Error creating machines for customer ${customerId}:`, error);
          errors += machineDataList.length;
        }
        continue;
      }
    }

    logger.info(`Import completed!`);
    logger.info(`Customers: ${customersCreated} created, ${customersSkipped} skipped`);
    logger.info(`Machines: ${machinesCreated} created, ${machinesSkipped} skipped`);
    logger.info(`Total customer-machine relationships processed: ${customerMap.size}`);
    logger.info(`Errors encountered: ${errors}`);

  } catch (error) {
    logger.error("Error during CSV import:", error);
    throw error;
  }
} 