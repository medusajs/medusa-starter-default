# Service Orders Import Script

This script imports legacy service order data from a CSV file into your MedusaJS service orders module. The script handles CSV files where each row represents a part/variant, and multiple rows can belong to the same service order.

## Features

- **Groups multiple parts per order**: Automatically groups CSV rows by service order number (`number` field)
- **Creates service order items**: Each part becomes a separate service order item
- **Calculates totals**: Automatically calculates total parts cost from all items
- **Preserves legacy data**: Stores all original information in metadata for traceability

## Usage

1. **Prepare your CSV file**
   - Place your CSV file at the root of the project as `service-orders.csv`
   - Each row represents one part/variant for a service order
   - Multiple rows with the same `number` (legacy service order ID) will be grouped into one service order

2. **Run the script**
   ```bash
   npx medusa exec src/scripts/load-service-orders.ts
   ```

## CSV Column Mapping

The script maps legacy CSV columns to the service order fields as follows:

### Core Service Order Fields
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| `number` | Service order grouping | Used to generate service_order_number as `SO-LEGACY-{number}` |
| `id` | `metadata.legacy_id` | Database ID stored in metadata |
| `number` | `metadata.legacy_number` | Original legacy number stored in metadata |
| `description` | `description` | Main service description |
| `description` | `customer_complaint` | Also used as customer complaint |
| `diagnosis` | `diagnosis` | Technician's diagnosis |
| `comment_worker` | `work_performed` | What work was performed |

### Service Type and Status
| CSV Column | Service Order Field | Mapping Logic |
|------------|-------------------|---------------|
| `category` | `service_type` | repair→standard, warranty→warranty, insurance→insurance |
| `status` | `status` | fase1→draft, fase2→ready_for_pickup, fase3→in_progress, fase4→done, fase5→returned_for_review |
| `on_location` | `service_location` | true→customer_location, false→workshop |

### Relationships
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| `client_id` | `customer_id` | Maps to existing customer via metadata.client_id |
| `machine_id` | `machine_id` | Direct mapping to machine |
| `assigned_to_worker_id` | `technician_id` | Direct mapping to technician |

### Financial Data
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| `labour_cost_adjusted` | `labor_rate` | Hourly rate |
| `total_labour_cost` | `total_labor_cost` | Total labor cost from CSV |
| `part_price` × `part_quantity` | `total_parts_cost` | Calculated from all parts for this order |
| Calculated | `total_cost` | Sum of labor + calculated parts costs |

### Service Order Items (Parts)
| CSV Column | Item Field | Notes |
|------------|------------|-------|
| `part_description` | `title` | Part description or generic title |
| `part_number` | `description` | Part number in description field |
| `part_quantity` | `quantity` | Quantity of this part |
| `part_price` | `unit_price` | Price per unit |
| Calculated | `total_amount` | quantity × unit_price |
| `part_number`, `part_brand` | `metadata` | Original part information preserved |

### Dates and Scheduling
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| `defect_date` | `scheduled_start_date` | When issue was reported |
| `registered_at_garage` | `actual_start_date` | When work actually started |
| `created_at` | `metadata.original_created_at` | Original creation date |

### Warranty Information
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| `warranty_number` | `warranty_claim_number` | Warranty claim reference |
| `warranty_number` | `warranty_approved` | True if warranty_number exists |

### Service Characteristics (Boolean Fields)
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| `appointment` | `has_appointment` | Service requires appointment |
| `replacement_vehicle` | `needs_replacement_vehicle` | Customer needs replacement |
| `minor_maintenance` | `includes_minor_maintenance` | Minor maintenance work |
| `major_maintenance` | `includes_major_maintenance` | Major maintenance work |
| `repeated_repair` | `is_repeated_repair` | Repeat of previous repair |
| `washed` | `includes_cleaning` | Vehicle cleaning included |

### Additional Information
| CSV Column | Service Order Field | Notes |
|------------|-------------------|-------|
| Multiple fields | `internal_notes` | Combines comment_office, comment_invoice, part info, machine hours |
| `comment_worker` | `customer_notes` | Worker's notes for customer |

### Metadata (Legacy Data Preservation)
All original CSV data is preserved in the `metadata` field including:
- Machine details (model, brand, VIN)
- Part information (number, brand, quantity, price)
- Invoice data (number, ID, printed status)
- Original status and category values
- Import timestamp

## Prerequisites

- Customers must be imported first (the script maps `client_id` to existing customers)
- Machines and technicians should be imported before service orders for proper relationships
- CSV file must be properly formatted with all expected columns

## Data Validation

The script includes validation for:
- Required fields (id, description)
- Date parsing with fallback to null
- Number parsing with fallback to 0
- Boolean parsing from various formats
- Customer mapping validation

## Error Handling

- Skips rows with missing essential data
- Continues processing if individual records fail
- Logs detailed error information
- Provides final import summary with statistics

## Sample CSV Format

This example shows how one service order (number 250617733C) could have multiple parts:

```csv
id,defect_date,number,client_id,category,machine_id,appointment,on_location,description,diagnosis,status,created_at,total_labour_cost,part_description,part_number,part_price,part_brand,part_quantity
33342,2025-06-17,250617733C,3343,Warranty,3283,True,False,"BC2506021 repairs needed","various repairs completed","fase8",2025-07-29 12:40:36.961967,389.5,ACCUMULATOR,51608829,621.0,cnh,1.0
33342,2025-06-17,250617733C,3343,Warranty,3283,True,False,"BC2506021 repairs needed","various repairs completed","fase8",2025-07-29 12:40:36.961967,389.5,"Filterelement NTZ",F29,37.85,kramp,1.0
33342,2025-06-17,250617733C,3343,Warranty,3283,True,False,"BC2506021 repairs needed","various repairs completed","fase8",2025-07-29 12:40:36.961967,389.5,RING,84015021,28.6,cnh,4.0
```

This will create:
- One service order (SO-LEGACY-250617733C) with total labor cost of 389.5 and total parts cost of 773.25 (621.0×1 + 37.85×1 + 28.6×4)
- Three service order items: accumulator (€621.00), filter element (€37.85), and rings (4 × €28.60)

## Post-Import

After import, you can:
- View imported service orders in the admin panel
- Search by legacy ID in metadata
- Create additional service order items and time entries
- Update status and continue normal workflow

The imported data maintains full traceability to the original legacy system through comprehensive metadata storage. 