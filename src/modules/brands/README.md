# Brand Module

A comprehensive brand management module for Medusa, specifically designed for spare parts businesses that need to handle multiple manufacturers and part suppliers.

## Features

- **Complete Brand Management**: Create, read, update, delete brands with rich metadata
- **OEM vs Aftermarket**: Distinguish between original equipment manufacturers and aftermarket suppliers
- **Authorization Tracking**: Track which brands you're authorized to sell
- **Index Module Integration**: High-performance filtering and searching across linked data
- **Module Links**: Connect brands to products, machines, technicians, and customers
- **Admin Interface**: Full admin dashboard integration with widgets and routes
- **Workflows**: Robust brand creation with validation and rollback capabilities

## Installation & Setup

### 1. Module Configuration

The brand module is already added to your `medusa-config.ts`:

```typescript
modules: [
  {
    resolve: "./src/modules/brands",
  },
  {
    resolve: "@medusajs/index", // Required for high-performance queries
  },
]
```

### 2. Enable Index Module Feature Flag

Add to your `.env` file:

```
MEDUSA_FF_INDEX_ENGINE=true
```

### 3. Run Migrations

```bash
npx medusa db:migrate
```

### 4. Seed Initial Data

```bash
npx medusa exec ./src/scripts/seed-brands.ts
```

## Data Model

### Brand Entity

```typescript
{
  id: string                    // Primary key
  name: string                  // "Caterpillar Inc."
  code: string                  // "CAT" (unique, uppercase)
  logo_url?: string            // Brand logo URL
  website_url?: string         // Official website
  contact_email?: string       // Parts department email
  contact_phone?: string       // Contact phone number
  description?: string         // Brand description
  country_of_origin?: string   // Manufacturing country
  warranty_terms?: string      // Warranty information
  authorized_dealer: boolean   // Are we authorized to sell this brand?
  is_oem: boolean             // Original Equipment Manufacturer?
  is_active: boolean          // Is brand active?
  display_order: number       // Sorting order in UI
  metadata?: object           // Additional custom data
}
```

## Module Links

### 1. Product-Brand Link

Links products to brands with Index Module support:

```typescript
// src/links/product-brand.ts
export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true, // One product can have multiple brands
  },
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name", "code", "authorized_dealer", "is_oem"],
  }
)
```

### 2. Machine-Brand Link

Links machines to their manufacturers:

```typescript
// src/links/machine-brand.ts
export default defineLink(
  MachineModule.linkable.machine,
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name", "code"],
  }
)
```

### 3. Technician-Brand Certification Link

Tracks technician certifications per brand:

```typescript
// src/links/technician-brand-certification.ts
export default defineLink(
  TechnicianModule.linkable.technician,
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name", "code"],
  },
  {
    database: {
      table: "technician_brand_certifications",
      extraColumns: {
        certification_level: { type: "text" }, // "basic", "advanced", "master"
        certification_date: { type: "date" },
        expiry_date: { type: "date" },
        certification_number: { type: "text" },
        is_active: { type: "boolean", default: true }
      }
    }
  }
)
```

## API Endpoints

### Admin API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/brands` | List brands with filtering |
| POST | `/admin/brands` | Create new brand |
| GET | `/admin/brands/{id}` | Get brand by ID |
| PUT | `/admin/brands/{id}` | Update brand |
| DELETE | `/admin/brands/{id}` | Delete brand |
| GET | `/admin/brands/search` | Advanced brand search |

### Query Parameters

- `is_active`: Filter by active status (`true`/`false`)
- `is_oem`: Filter by OEM status (`true`/`false`)
- `authorized_dealer`: Filter by authorization (`true`/`false`)
- `search`: Text search in name and code
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

## Usage Examples

### 1. Basic Brand Operations

```typescript
// Get brands service
const brandsService = container.resolve("brands")

// Create a brand
const brand = await brandsService.createBrand({
  name: "Caterpillar Inc.",
  code: "CAT",
  is_oem: true,
  authorized_dealer: true
})

// Get OEM brands only
const oemBrands = await brandsService.listOEMBrands()

// Search brands
const searchResults = await brandsService.searchBrands("cat")
```

### 2. High-Performance Queries with Index Module

```typescript
// Find all Caterpillar products
const { data: catProducts } = await query.index({
  entity: "product",
  fields: ["*", "brand.*", "variants.*"],
  filters: {
    brand: { code: "CAT" }
  }
})

// Find products by multiple brands
const { data: products } = await query.index({
  entity: "product", 
  fields: ["*", "brand.*"],
  filters: {
    brand: {
      code: { $in: ["CAT", "KOM", "VOL"] },
      authorized_dealer: true
    }
  }
})

// Find certified technicians for a brand
const { data: certifiedTechs } = await query.graph({
  entity: "technician",
  fields: ["*", "brand_certifications.*"],
  filters: {
    brand_certifications: {
      brand: { code: "CAT" },
      certification_level: "master"
    }
  }
})
```

### 3. Product Variants with Multiple Brands

```typescript
// Create product with multiple brand variants
const product = {
  title: "Hydraulic Pump HP-2000",
  options: [
    {
      title: "Brand",
      values: ["Caterpillar", "Komatsu", "Aftermarket"]
    }
  ],
  variants: [
    {
      title: "CAT HP-2000",
      sku: "CAT-HP2000",
      options: { Brand: "Caterpillar" },
      // This variant would be linked to CAT brand
    },
    {
      title: "KOM HP-2000", 
      sku: "KOM-HP2000",
      options: { Brand: "Komatsu" },
      // This variant would be linked to KOM brand
    }
  ]
}
```

## Admin Interface

### 1. Brand Management Page

- Full CRUD operations for brands
- Advanced filtering and search
- Data table with sorting and pagination
- Status badges (OEM/Aftermarket, Authorized/Not Authorized)

### 2. Product Brand Widget

- Appears on product detail pages
- Select multiple brands for a product
- Visual indicators for OEM and authorized brands
- Save brand associations

## Workflows

### Create Brand Workflow

```typescript
import { createBrandWorkflow } from "./workflows/brands/create-brand-workflow"

// Use the workflow
const { result } = await createBrandWorkflow.run({
  input: {
    name: "Caterpillar Inc.",
    code: "CAT",
    is_oem: true,
    authorized_dealer: true
  }
})
```

The workflow includes:
- Data validation
- Code uniqueness checking
- Automatic code uppercasing
- Rollback on failure

## Business Benefits

### For Spare Parts Business

1. **Multi-Brand Support**: Handle OEM and aftermarket parts seamlessly
2. **Authorization Tracking**: Know which brands you can legally sell
3. **Technician Expertise**: Match certified technicians to brand-specific jobs
4. **Customer Preferences**: Track and leverage customer brand loyalties
5. **Inventory Organization**: Organize warehouse by brand requirements
6. **Pricing Strategies**: Different margins for OEM vs aftermarket
7. **Warranty Management**: Brand-specific warranty terms and processes

### Performance Benefits

1. **Index Module**: High-performance cross-module queries
2. **Efficient Filtering**: Filter products by brand characteristics
3. **Scalable**: Handle thousands of brands and millions of parts
4. **Caching**: Built-in query optimization

## Best Practices

### 1. Brand Codes

- Keep codes short (2-10 characters)
- Use uppercase for consistency
- Make them memorable and recognizable
- Avoid special characters

### 2. Brand Organization

- Use `display_order` for consistent UI sorting
- Mark inactive brands instead of deleting
- Maintain accurate authorization status
- Keep warranty terms up to date

### 3. Product-Brand Relationships

- Link variants to specific brands when possible
- Use product options for brand selection in UI
- Maintain both OEM and aftermarket options
- Track part number mappings between brands

## Migration from Existing Systems

If migrating from existing systems:

1. Export brand data with mappings
2. Run the seed script with your data
3. Update product records to link to brands
4. Test Index Module queries
5. Train staff on new admin interface

## Troubleshooting

### Common Issues

1. **Index Module not syncing**: Ensure feature flag is enabled
2. **Brand codes not unique**: Check existing data before import
3. **Links not working**: Run migrations after creating links
4. **Performance issues**: Ensure Index Module is properly configured

### Debug Queries

```typescript
// Check if brand exists
const brand = await brandsService.retrieveBrandByCode("CAT")

// Verify Index Module ingestion
const { data } = await query.index({
  entity: "brand",
  fields: ["*"]
})

// Test product-brand links
const { data: linkedProducts } = await query.graph({
  entity: "product",
  fields: ["*", "brands.*"]
})
```

This Brand module provides a solid foundation for managing complex brand relationships in your spare parts business while maintaining high performance and scalability. 