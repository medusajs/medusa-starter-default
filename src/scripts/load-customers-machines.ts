import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules,
} from "@medusajs/framework/utils"
import { MACHINES_MODULE } from "../modules/machines"
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

export default async function loadCustomersMachines({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const customerModuleService = container.resolve(Modules.CUSTOMER);
  const machinesService = container.resolve(MACHINES_MODULE);

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
    const machineMap = new Map<string, string>(); // machine_id -> machine_id
    let customersCreated = 0;
    let machinesCreated = 0;
    let customersSkipped = 0;
    let machinesSkipped = 0;

    // Process records
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
              logger.info(`Found existing customer: ${row.email}`);
            } else {
              // Create new customer
              const customerData = {
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
              };

              const customer = await customerModuleService.createCustomers(customerData);
              customerId = customer.id;
              customerMap.set(row.client_id, customerId);
              customersCreated++;
              logger.info(`Created customer: ${customer.email} (${customer.first_name} ${customer.last_name})`);
            }
          } catch (error) {
            if (error.message && error.message.includes('unique')) {
              logger.warn(`Customer with email ${row.email} already exists, skipping...`);
              customersSkipped++;
            } else {
              logger.error(`Error creating customer for client_id ${row.client_id}:`, error.message);
            }
            continue;
          }
        }

        // Process Machine
        let machineId = machineMap.get(row.machine_id);
        
        if (!machineId) {
          try {
            // Check if machine already exists by serial number
            const existingMachines = await machinesService.listMachines({
              serial_number: row.vin || row.machine_id
            });

            if (existingMachines.length > 0) {
              machineId = existingMachines[0].id;
              logger.info(`Found existing machine: ${row.vin || row.machine_id}`);
            } else {
              // Create new machine
              const machineData = {
                model_number: row.model || row.category || 'Unknown Model',
                serial_number: row.vin || row.machine_id,
                license_plate: row.license_plate || null,
                year: parseNumber(row.build_date) || parseNumber(row.year) || null,
                engine_hours: parseNumber(row.tlm) || null,
                fuel_type: null, // Not in CSV
                horsepower: null, // Not in CSV
                weight: null, // Not in CSV
                purchase_date: parseDate(row.delivery_date) || null,
                purchase_price: null, // Not in CSV
                current_value: null, // Not in CSV
                status: row.rental === 'true' ? 'active' : 'active', // Default to active
                location: null, // Not in CSV
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
              };

              const machine = await machinesService.createMachines(machineData);
              machineId = machine.id;
              machineMap.set(row.machine_id, machineId);
              machinesCreated++;
              logger.info(`Created machine: ${machine.model_number} (${machine.serial_number}) for customer ${customerId}`);
            }
          } catch (error) {
            if (error.message && error.message.includes('unique')) {
              logger.warn(`Machine with serial number ${row.vin || row.machine_id} already exists, skipping...`);
              machinesSkipped++;
            } else {
              logger.error(`Error creating machine for machine_id ${row.machine_id}:`, error.message);
            }
            continue;
          }
        }

      } catch (error) {
        logger.error(`Error processing row:`, error);
        continue;
      }
    }

    logger.info(`Import completed!`);
    logger.info(`Customers: ${customersCreated} created, ${customersSkipped} skipped`);
    logger.info(`Machines: ${machinesCreated} created, ${machinesSkipped} skipped`);
    logger.info(`Total customer-machine relationships processed: ${customerMap.size}`);

  } catch (error) {
    logger.error("Error during CSV import:", error);
    throw error;
  }
} 