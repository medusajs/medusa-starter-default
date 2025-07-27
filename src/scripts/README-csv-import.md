# CSV Import Script for Customers and Machines

This script allows you to import customer and machine data from a CSV file into your MedusaJS database.

## Usage

1. **Prepare your CSV file**
   - Place your CSV file at the root of the project as `customers-machines.csv`
   - Ensure the CSV has the following columns (case-sensitive):
     - `client_id` - Unique identifier for the customer
     - `machine_id` - Unique identifier for the machine
     - `id` - Additional customer ID
     - `number` - Customer number
     - `name` - Customer name
     - `street` - Street address
     - `house_number` - House number
     - `zip_code` - Postal code
     - `city` - City
     - `country` - Country
     - `phone` - Phone number
     - `fax` - Fax number
     - `mobile` - Mobile number
     - `email` - Email address
     - `created_at` - Customer creation date
     - `updated_at` - Customer update date
     - `vat` - VAT number
     - `adsolut_id` - Adsolut ID
     - `id_machine` - Machine ID
     - `vin` - Vehicle identification number
     - `category` - Machine category
     - `model` - Machine model
     - `brand` - Machine brand
     - `license_plate` - License plate
     - `created_at_machine` - Machine creation date
     - `updated_at_machine` - Machine update date
     - `rental` - Rental status
     - `comment` - Comments
     - `work_needed` - Work needed
     - `delivery_date` - Delivery date
     - `tlm` - TLM (engine hours)
     - `build_date` - Build date
     - `maintenance` - Maintenance status
     - `client_full_name` - Full client name
     - `machine_description` - Machine description

2. **Run the script**
   ```bash
   npx medusa exec src/scripts/load-customers-machines.ts
   ```

## What the script does

1. **Customer Processing**:
   - Creates customers using MedusaJS core customer module
   - Maps customer addresses from CSV data
   - Stores original data in metadata for reference
   - Handles duplicate detection by email

2. **Machine Processing**:
   - Creates machines using the custom machines module
   - Links machines to customers via `customer_id` field
   - Maps CSV fields to machine model fields
   - Stores original data in metadata

3. **Data Mapping**:
   - `client_id` → Customer identifier
   - `machine_id` → Machine identifier
   - `name` → Customer first_name/last_name
   - `email` → Customer email
   - `vin` → Machine serial_number
   - `model` → Machine model_number
   - `brand` → Stored in metadata
   - `tlm` → Machine engine_hours
   - `build_date` → Machine year
   - `delivery_date` → Machine purchase_date

4. **Error Handling**:
   - Skips rows without essential data
   - Handles duplicate customers and machines
   - Provides detailed logging
   - Continues processing on individual row errors

## Output

The script provides detailed logging including:
- Number of customers created vs skipped
- Number of machines created vs skipped
- Total customer-machine relationships processed
- Error messages for failed operations

## Example CSV Format

```csv
client_id,machine_id,id,number,name,street,house_number,zip_code,city,country,phone,fax,mobile,email,created_at,updated_at,vat,adsolut_id,id_machine,vin,category,model,brand,license_plate,created_at_machine,updated_at_machine,rental,comment,work_needed,delivery_date,tlm,build_date,maintenance,client_full_name,machine_description
CLI001,MAC001,CUST001,001,"John Doe","Main Street",123,1000,"Brussels","Belgium","+32 123 456 789","","+32 123 456 789","john.doe@example.com","2024-01-01","2024-01-01","BE123456789",ADS001,MAC001,VIN123456,"Excavator","CAT320D","Caterpillar","ABC123","2024-01-01","2024-01-01","false","Good condition","None","2024-01-01",1500,2020,"false","John Doe","CAT 320D Excavator"
```

## Notes

- The script expects the CSV file to be named `customers-machines.csv` and placed at the project root
- Customers are created with addresses based on the CSV address fields
- Machines are automatically linked to customers via the `customer_id` field
- Original CSV data is preserved in the `metadata` field for reference
- The script handles both new and existing customers/machines gracefully 