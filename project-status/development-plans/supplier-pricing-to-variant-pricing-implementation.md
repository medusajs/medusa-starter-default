# Supplier Price Lists to Variant Pricing Implementation Plan

**Date**: 2025-10-17  
**Context**: Spare Parts Garage - B2B Price List to B2C Variant Pricing  
**Goal**: Automatically sync supplier gross prices to variant selling prices using Medusa best practices

---

## Executive Summary

This plan implements automatic synchronization of supplier price list **gross prices** to product variant **selling prices** in a spare parts garage context, where:
- **Gross Price** = Market/end-user selling price (what the garage charges customers)
- **Net Price** = Discounted cost price (what the garage pays the supplier)
- **Discount** = Garage's margin (gross - net)

The implementation leverages Medusa's native pricing workflows, handles multi-supplier scenarios through a preferred supplier system, and manages variants that may not exist in the catalog yet.

---

## Business Model Overview

### Price Flow
```
Supplier Price List (CSV)
├── Part Number: ABC123
├── Gross Price: €100.00  ──→  Variant Selling Price (to customers)
├── Discount: 30%
└── Net Price: €70.00     ──→  Supplier Cost Price (internal)
```

### Key Principles
1. **Gross price = Selling price**: Customer-facing price comes from supplier's market price
2. **Net price = Cost price**: Internal cost tracking for margin calculation
3. **Preferred supplier wins**: When multiple suppliers offer the same part, use the preferred supplier's pricing
4. **Auto-create variants**: If a part number doesn't exist, create it automatically

---

## Current State Analysis

### ✅ What's Already Implemented

1. **Supplier Price List Model** (`supplier_price_list_item`)
   - Already captures: `gross_price`, `net_price`, `discount_amount`, `discount_percentage`
   - Links to: `product_variant_id`, `supplier_id` (via price list)

2. **Price List Processing** (`processPriceListItemsStep`)
   - Creates price list items
   - Updates `SupplierProduct.cost_price` with `net_price`
   - CSV parsing with brand awareness

3. **Preferred Supplier Logic** (`findBestSupplierForProduct`)
   - Sorts by `is_preferred_supplier` flag
   - Falls back to lowest cost price

4. **Multi-Supplier View** (`/admin/products/[id]/suppliers`)
   - Shows all sourcing options per variant
   - Displays both `supplier_product` and `price_list` sources

### ❌ What's Missing

1. **No automatic sync of gross_price → variant selling price**
2. **No variant auto-creation for unknown part numbers**
3. **No conflict resolution when multiple suppliers update the same variant**
4. **No pricing sync workflow or event system**
5. **No admin UI toggle for enabling/disabling auto-pricing**

---

## Implementation Plan

### Phase 1: Core Pricing Sync Infrastructure

#### 1.1 Add Configuration
**File**: `medusa-config.ts`

Add feature flags and configuration:

```typescript
// Add to module options or environment variables
const pricingSyncConfig = {
  // Enable automatic sync of supplier gross prices to variant prices
  enableAutoPricing: process.env.AUTO_SYNC_SUPPLIER_PRICES === "true",
  
  // Default currency for prices (should match supplier price lists)
  defaultCurrency: process.env.DEFAULT_CURRENCY_CODE || "EUR",
  
  // Strategy for handling conflicts (preferred_supplier | lowest_price | manual)
  conflictStrategy: process.env.PRICING_CONFLICT_STRATEGY || "preferred_supplier",
  
  // Whether to create variants for unknown part numbers
  autoCreateVariants: process.env.AUTO_CREATE_VARIANTS === "true",
  
  // Whether to update prices even if they already exist
  overwriteExistingPrices: process.env.OVERWRITE_EXISTING_PRICES === "true",
}
```

**Environment Variables** (`.env.development.example`, `.env.production.example`):
```bash
# Supplier Pricing Configuration
AUTO_SYNC_SUPPLIER_PRICES=true
AUTO_CREATE_VARIANTS=true
OVERWRITE_EXISTING_PRICES=true
DEFAULT_CURRENCY_CODE=EUR
PRICING_CONFLICT_STRATEGY=preferred_supplier
```

---

#### 1.2 Extend Data Models

**File**: `src/modules/purchasing/models/supplier.model.ts`

Add pricing strategy preference:

```typescript
const Supplier = model.define("supplier", {
  // ... existing fields
  
  // Pricing configuration
  is_pricing_source: model.boolean().default(false), // Can this supplier's prices update variant prices?
  pricing_priority: model.number().default(100), // Lower = higher priority (0-999)
  auto_sync_prices: model.boolean().default(true), // Auto-sync for this supplier?
})
```

**Migration**: `src/modules/purchasing/migrations/Migration20251017000000.ts`

```typescript
import { Migration } from "@mikro-orm/migrations"

export class Migration20251017000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE supplier 
      ADD COLUMN IF NOT EXISTS is_pricing_source BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS pricing_priority INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS auto_sync_prices BOOLEAN DEFAULT TRUE;
    `)
    
    this.addSql(`
      CREATE INDEX IF NOT EXISTS supplier_pricing_source_idx 
      ON supplier (is_pricing_source, pricing_priority) 
      WHERE is_pricing_source = TRUE AND is_active = TRUE;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS supplier_pricing_source_idx;
    `)
    
    this.addSql(`
      ALTER TABLE supplier 
      DROP COLUMN IF EXISTS is_pricing_source,
      DROP COLUMN IF EXISTS pricing_priority,
      DROP COLUMN IF EXISTS auto_sync_prices;
    `)
  }
}
```

**File**: `src/modules/purchasing/models/supplier-price-list-item.model.ts`

Add sync tracking:

```typescript
const SupplierPriceListItem = model.define("supplier_price_list_item", {
  // ... existing fields
  
  // Sync tracking
  price_synced_at: model.dateTime().nullable(), // Last time gross_price was synced to variant
  price_sync_status: model.text().nullable(), // success | failed | skipped | pending
  price_sync_error: model.text().nullable(), // Error message if sync failed
})
```

---

#### 1.3 Create Pricing Sync Workflow

**File**: `src/workflows/sync-variant-prices-from-supplier.ts`

This is the core workflow that syncs supplier gross prices to variant selling prices:

```typescript
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { 
  upsertVariantPricesWorkflow 
} from "@medusajs/medusa/core-flows"
import { 
  resolveVariantPricingConflictsStep,
  updatePriceListItemSyncStatusStep 
} from "../steps"

export type SyncVariantPricesFromSupplierInput = {
  supplier_price_list_id: string
  force_sync?: boolean // Override existing prices even if newer
  dry_run?: boolean // Don't actually update, just report what would change
}

export const syncVariantPricesFromSupplierWorkflowId = 
  "sync-variant-prices-from-supplier"

/**
 * Syncs supplier price list gross prices to product variant selling prices.
 * 
 * This workflow:
 * 1. Loads supplier price list items with gross_price
 * 2. Resolves conflicts when multiple suppliers price the same variant
 * 3. Updates variant prices using Medusa's native pricing system
 * 4. Tracks sync status on each price list item
 * 
 * @example
 * await syncVariantPricesFromSupplierWorkflow(container).run({
 *   input: {
 *     supplier_price_list_id: "spl_123",
 *     force_sync: false,
 *   }
 * })
 */
export const syncVariantPricesFromSupplierWorkflow = createWorkflow(
  syncVariantPricesFromSupplierWorkflowId,
  (input: WorkflowData<SyncVariantPricesFromSupplierInput>) => {
    
    // Step 1: Resolve which variants should be updated and with what prices
    const { variantsToUpdate, itemsToTrack } = resolveVariantPricingConflictsStep(input)
    
    // Step 2: Update variant prices using Medusa's native workflow
    // Only run if not dry_run
    const updatedVariants = when(input, ({ dry_run }) => !dry_run).then(() => {
      return upsertVariantPricesWorkflow.runAsStep({
        input: {
          variantPrices: variantsToUpdate.map(v => ({
            variant_id: v.variant_id,
            product_id: v.product_id,
            prices: [{
              amount: v.amount,
              currency_code: v.currency_code,
              // Optional: Add rules for customer groups, regions, etc.
            }]
          })),
          previousVariantIds: []
        }
      })
    })
    
    // Step 3: Update sync tracking on price list items
    updatePriceListItemSyncStatusStep({
      items: itemsToTrack,
      dry_run: input.dry_run
    })
    
    return new WorkflowResponse({
      updated_variants: updatedVariants,
      items_processed: itemsToTrack,
    })
  }
)
```

---

#### 1.4 Create Workflow Steps

**File**: `src/workflows/steps/resolve-variant-pricing-conflicts.ts`

Determines which variants to update based on supplier priority:

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "@/modules/purchasing"
import PurchasingService from "@/modules/purchasing/service"

type ResolveVariantPricingConflictsInput = {
  supplier_price_list_id: string
  force_sync?: boolean
}

type VariantPriceUpdate = {
  variant_id: string
  product_id: string
  amount: number
  currency_code: string
  source_item_id: string
  supplier_id: string
  supplier_name: string
}

export const resolveVariantPricingConflictsStep = createStep(
  "resolve-variant-pricing-conflicts",
  async (input: ResolveVariantPricingConflictsInput, { container }) => {
    const purchasingService = container.resolve(PURCHASING_MODULE) as PurchasingService
    const productModule = container.resolve(Modules.PRODUCT)
    const remoteQuery = container.resolve("remoteQuery")
    
    const config = {
      enableAutoPricing: process.env.AUTO_SYNC_SUPPLIER_PRICES === "true",
      conflictStrategy: process.env.PRICING_CONFLICT_STRATEGY || "preferred_supplier",
      overwriteExistingPrices: process.env.OVERWRITE_EXISTING_PRICES === "true",
    }
    
    if (!config.enableAutoPricing && !input.force_sync) {
      return new StepResponse({
        variantsToUpdate: [],
        itemsToTrack: [],
        skipped: true,
        reason: "Auto-pricing is disabled"
      })
    }
    
    // Get price list with supplier info
    const priceList = await purchasingService.retrieveSupplierPriceList(
      input.supplier_price_list_id,
      { relations: ["items"] }
    )
    
    const supplier = await purchasingService.retrieveSupplier(priceList.supplier_id)
    
    // Check if this supplier is allowed to be a pricing source
    if (!supplier.is_pricing_source && !input.force_sync) {
      return new StepResponse({
        variantsToUpdate: [],
        itemsToTrack: priceList.items.map(item => ({
          id: item.id,
          status: "skipped",
          error: "Supplier is not configured as a pricing source"
        })),
        skipped: true
      })
    }
    
    // Group items by variant_id to handle conflicts
    const itemsByVariant = new Map<string, any[]>()
    for (const item of priceList.items) {
      if (!item.gross_price || item.gross_price <= 0) {
        continue // Skip items without valid gross price
      }
      
      if (!itemsByVariant.has(item.product_variant_id)) {
        itemsByVariant.set(item.product_variant_id, [])
      }
      itemsByVariant.get(item.product_variant_id)!.push({
        ...item,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_priority: supplier.pricing_priority,
        is_pricing_source: supplier.is_pricing_source,
      })
    }
    
    const variantsToUpdate: VariantPriceUpdate[] = []
    const itemsToTrack: any[] = []
    
    // For each variant, determine if we should update its price
    for (const [variantId, items] of itemsByVariant.entries()) {
      try {
        // Check if variant exists
        const variant = await productModule.retrieveProductVariant(variantId, {
          select: ["id", "product_id"],
          relations: ["product"]
        })
        
        if (!variant) {
          items.forEach(item => {
            itemsToTrack.push({
              id: item.id,
              status: "failed",
              error: `Variant ${variantId} not found`
            })
          })
          continue
        }
        
        // Get current variant prices
        const variantWithPrices = await remoteQuery({
          entryPoint: "product_variant",
          fields: ["id", "prices.*"],
          variables: { filters: { id: variantId } }
        })
        
        const currentPrices = variantWithPrices?.[0]?.prices || []
        const hasExistingPrice = currentPrices.some(
          p => p.currency_code === priceList.currency_code
        )
        
        // Skip if price exists and we're not overwriting
        if (hasExistingPrice && !config.overwriteExistingPrices && !input.force_sync) {
          items.forEach(item => {
            itemsToTrack.push({
              id: item.id,
              status: "skipped",
              error: "Price already exists and overwrite is disabled"
            })
          })
          continue
        }
        
        // Handle conflict resolution if multiple items for same variant
        let selectedItem = items[0]
        
        if (items.length > 1) {
          // Apply conflict resolution strategy
          if (config.conflictStrategy === "preferred_supplier") {
            // Sort by: is_pricing_source DESC, pricing_priority ASC, gross_price ASC
            items.sort((a, b) => {
              if (a.is_pricing_source !== b.is_pricing_source) {
                return b.is_pricing_source ? 1 : -1
              }
              if (a.supplier_priority !== b.supplier_priority) {
                return a.supplier_priority - b.supplier_priority
              }
              return a.gross_price - b.gross_price
            })
            selectedItem = items[0]
          } else if (config.conflictStrategy === "lowest_price") {
            selectedItem = items.reduce((min, item) => 
              item.gross_price < min.gross_price ? item : min
            )
          }
        }
        
        // Add to update list
        variantsToUpdate.push({
          variant_id: variantId,
          product_id: variant.product_id,
          amount: selectedItem.gross_price,
          currency_code: priceList.currency_code,
          source_item_id: selectedItem.id,
          supplier_id: selectedItem.supplier_id,
          supplier_name: selectedItem.supplier_name,
        })
        
        // Track sync status for all items
        items.forEach(item => {
          itemsToTrack.push({
            id: item.id,
            status: item.id === selectedItem.id ? "success" : "skipped",
            error: item.id === selectedItem.id 
              ? null 
              : `Overridden by supplier ${selectedItem.supplier_name}`
          })
        })
        
      } catch (error) {
        items.forEach(item => {
          itemsToTrack.push({
            id: item.id,
            status: "failed",
            error: error.message
          })
        })
      }
    }
    
    return new StepResponse({
      variantsToUpdate,
      itemsToTrack,
      skipped: false
    })
  }
)
```

**File**: `src/workflows/steps/update-price-list-item-sync-status.ts`

Tracks the sync status on price list items:

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASING_MODULE } from "@/modules/purchasing"
import PurchasingService from "@/modules/purchasing/service"

type UpdatePriceListItemSyncStatusInput = {
  items: Array<{
    id: string
    status: "success" | "failed" | "skipped"
    error?: string | null
  }>
  dry_run?: boolean
}

export const updatePriceListItemSyncStatusStep = createStep(
  "update-price-list-item-sync-status",
  async (input: UpdatePriceListItemSyncStatusInput, { container }) => {
    if (input.dry_run) {
      return new StepResponse({ updated: 0, dry_run: true })
    }
    
    const purchasingService = container.resolve(PURCHASING_MODULE) as PurchasingService
    
    const updates = input.items.map(item => ({
      id: item.id,
      price_sync_status: item.status,
      price_sync_error: item.error,
      price_synced_at: item.status === "success" ? new Date() : undefined
    }))
    
    await purchasingService.updateSupplierPriceListItems(updates)
    
    return new StepResponse({ updated: updates.length })
  }
)
```

---

### Phase 2: Variant Auto-Creation for Unknown Part Numbers

#### 2.1 Create Variant Auto-Creation Workflow

**File**: `src/workflows/create-variants-from-supplier-price-list.ts`

```typescript
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import { findOrCreateProductForPartNumbersStep } from "../steps"

export type CreateVariantsFromSupplierPriceListInput = {
  supplier_price_list_id: string
  // Default product to add variants to, or create new products per brand
  default_product_id?: string
  // Auto-generate product per brand (e.g., "Brand X Parts")
  create_product_per_brand?: boolean
}

/**
 * Creates product variants for part numbers that don't exist in the catalog yet.
 * 
 * Strategy:
 * 1. Find price list items without matching product_variant_id
 * 2. Group by supplier SKU (part number)
 * 3. Create variants under appropriate products (by brand or default product)
 * 4. Link back to price list items
 */
export const createVariantsFromSupplierPriceListWorkflow = createWorkflow(
  "create-variants-from-supplier-price-list",
  (input: WorkflowData<CreateVariantsFromSupplierPriceListInput>) => {
    
    // Step 1: Find/create products for orphaned part numbers
    const { variantsToCreate, itemsToLink } = 
      findOrCreateProductForPartNumbersStep(input)
    
    // Step 2: Create variants using Medusa's native workflow
    const createdVariants = createProductVariantsWorkflow.runAsStep({
      input: {
        product_variants: variantsToCreate
      }
    })
    
    // Step 3: Link created variants back to price list items
    linkVariantsToPriceListItemsStep({
      variant_mappings: createdVariants,
      items_to_link: itemsToLink
    })
    
    return new WorkflowResponse({
      created_variants: createdVariants
    })
  }
)
```

**File**: `src/workflows/steps/find-or-create-product-for-part-numbers.ts`

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "@/modules/purchasing"
import PurchasingService from "@/modules/purchasing/service"

export const findOrCreateProductForPartNumbersStep = createStep(
  "find-or-create-product-for-part-numbers",
  async (input: any, { container }) => {
    const purchasingService = container.resolve(PURCHASING_MODULE) as PurchasingService
    const productModule = container.resolve(Modules.PRODUCT)
    
    const config = {
      autoCreateVariants: process.env.AUTO_CREATE_VARIANTS === "true",
      createProductPerBrand: input.create_product_per_brand ?? true,
      defaultProductId: input.default_product_id
    }
    
    if (!config.autoCreateVariants) {
      return new StepResponse({
        variantsToCreate: [],
        itemsToLink: [],
        skipped: true
      })
    }
    
    // Get price list items that don't have a variant yet
    const priceList = await purchasingService.retrieveSupplierPriceList(
      input.supplier_price_list_id,
      { relations: ["items"] }
    )
    
    const orphanedItems = priceList.items.filter(
      item => !item.product_variant_id && item.supplier_sku
    )
    
    if (orphanedItems.length === 0) {
      return new StepResponse({
        variantsToCreate: [],
        itemsToLink: [],
        skipped: true
      })
    }
    
    // Get supplier and brand info
    const supplier = await purchasingService.retrieveSupplier(priceList.supplier_id)
    
    // Group by brand_id (if available)
    const itemsByBrand = new Map<string, any[]>()
    for (const item of orphanedItems) {
      const brandKey = priceList.brand_id || "default"
      if (!itemsByBrand.has(brandKey)) {
        itemsByBrand.set(brandKey, [])
      }
      itemsByBrand.get(brandKey)!.push(item)
    }
    
    const variantsToCreate: any[] = []
    const itemsToLink: any[] = []
    
    for (const [brandKey, items] of itemsByBrand.entries()) {
      let productId = config.defaultProductId
      
      // Find or create product for this brand
      if (config.createProductPerBrand && brandKey !== "default") {
        // Try to find existing "Parts Catalog" product for this brand
        const products = await productModule.listProducts({
          title: { $ilike: `%${supplier.name}%Parts%` }
        })
        
        if (products.length > 0) {
          productId = products[0].id
        } else {
          // Create new product (would need separate workflow/step)
          // For now, use default or skip
          continue
        }
      }
      
      if (!productId) {
        continue // Skip if no product to add variants to
      }
      
      // Create variant data for each orphaned item
      for (const item of items) {
        variantsToCreate.push({
          product_id: productId,
          title: item.supplier_sku, // Use part number as title initially
          sku: item.supplier_sku,
          // Price will be set by pricing sync workflow
          manage_inventory: true,
          allow_backorder: false,
        })
        
        itemsToLink.push({
          price_list_item_id: item.id,
          supplier_sku: item.supplier_sku,
        })
      }
    }
    
    return new StepResponse({
      variantsToCreate,
      itemsToLink
    })
  }
)
```

---

### Phase 3: Integration with Price List Upload

#### 3.1 Modify Price List Processing Workflow

**File**: `src/modules/purchasing/workflows/upload-supplier-price-list.ts`

Add the new workflows to the existing upload process:

```typescript
import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  validateSupplierStep,
  parsePriceListCsvStep,
  createSupplierPriceListStep,
  processPriceListItemsStep
} from "../steps"
import { 
  createVariantsFromSupplierPriceListWorkflow,
  syncVariantPricesFromSupplierWorkflow 
} from "@/workflows"

export const uploadSupplierPriceListWorkflow = createWorkflow(
  "upload-supplier-price-list",
  (input: WorkflowData<UploadSupplierPriceListInput>) => {
    
    // Existing steps...
    const { supplier } = validateSupplierStep({ supplier_id: input.supplier_id })
    const { items, errors } = parsePriceListCsvStep(input)
    const { price_list } = createSupplierPriceListStep({...})
    const { items: priceListItems } = processPriceListItemsStep({...})
    
    // NEW: Auto-create variants for unknown part numbers
    const autoCreateEnabled = transform({ supplier }, (data) => 
      process.env.AUTO_CREATE_VARIANTS === "true" && data.supplier.auto_sync_prices
    )
    
    when({ autoCreateEnabled }, ({ autoCreateEnabled }) => autoCreateEnabled).then(() => {
      createVariantsFromSupplierPriceListWorkflow.runAsStep({
        input: {
          supplier_price_list_id: price_list.id,
          create_product_per_brand: true
        }
      })
    })
    
    // NEW: Sync gross prices to variant selling prices
    const autoSyncEnabled = transform({ supplier }, (data) => 
      process.env.AUTO_SYNC_SUPPLIER_PRICES === "true" && data.supplier.auto_sync_prices
    )
    
    when({ autoSyncEnabled }, ({ autoSyncEnabled }) => autoSyncEnabled).then(() => {
      syncVariantPricesFromSupplierWorkflow.runAsStep({
        input: {
          supplier_price_list_id: price_list.id,
          force_sync: false
        }
      })
    })
    
    return new WorkflowResponse({
      price_list,
      items: priceListItems,
      errors
    })
  }
)
```

---

### Phase 4: Admin UI Enhancements

#### 4.1 Supplier Configuration UI

**File**: `src/admin/routes/suppliers/[id]/components/supplier-pricing-settings-section.tsx`

```typescript
import { useState } from "react"
import { Button, Container, Heading, Switch, Label, Input, toast } from "@medusajs/ui"

export const SupplierPricingSettingsSection = ({ supplier, onUpdate }) => {
  const [isPricingSource, setIsPricingSource] = useState(supplier.is_pricing_source)
  const [autoSyncPrices, setAutoSyncPrices] = useState(supplier.auto_sync_prices)
  const [pricingPriority, setPricingPriority] = useState(supplier.pricing_priority)
  
  const handleSave = async () => {
    try {
      const res = await fetch(`/admin/suppliers/${supplier.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_pricing_source: isPricingSource,
          auto_sync_prices: autoSyncPrices,
          pricing_priority: pricingPriority,
        }),
      })
      
      if (!res.ok) throw new Error("Failed to update supplier")
      toast.success("Pricing settings updated")
      onUpdate?.()
    } catch (e: any) {
      toast.error(e.message || "Failed to update settings")
    }
  }
  
  return (
    <Container className="p-6 space-y-4">
      <Heading level="h2">Pricing Configuration</Heading>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Use as Pricing Source</Label>
            <p className="text-sm text-ui-fg-muted">
              Allow this supplier's gross prices to update variant selling prices
            </p>
          </div>
          <Switch 
            checked={isPricingSource} 
            onCheckedChange={setIsPricingSource} 
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-Sync Prices</Label>
            <p className="text-sm text-ui-fg-muted">
              Automatically sync prices when uploading price lists
            </p>
          </div>
          <Switch 
            checked={autoSyncPrices} 
            onCheckedChange={setAutoSyncPrices}
            disabled={!isPricingSource}
          />
        </div>
        
        <div>
          <Label>Pricing Priority</Label>
          <p className="text-sm text-ui-fg-muted mb-2">
            Lower numbers = higher priority (0-999). Used when multiple suppliers price the same product.
          </p>
          <Input
            type="number"
            min="0"
            max="999"
            value={pricingPriority}
            onChange={(e) => setPricingPriority(parseInt(e.target.value))}
            disabled={!isPricingSource}
          />
        </div>
      </div>
      
      <Button onClick={handleSave}>Save Pricing Settings</Button>
    </Container>
  )
}
```

Add to supplier detail page:

**File**: `src/admin/routes/suppliers/[id]/page.tsx`

```typescript
import { SupplierPricingSettingsSection } from "./components/supplier-pricing-settings-section"

const SupplierDetailPage = () => {
  // ... existing code
  
  return (
    <div className="flex flex-col gap-y-2">
      <SupplierGeneralSection supplier={supplier} />
      <SupplierContactSection supplier={supplier} />
      <SupplierAddressSection supplier={supplier} />
      <SupplierFinancialSection supplier={supplier} />
      <SupplierPricingSettingsSection supplier={supplier} onUpdate={refetch} /> {/* NEW */}
      <SupplierBrandsSection supplierId={supplier.id} />
      <SupplierPriceLists data={supplier} />
    </div>
  )
}
```

---

#### 4.2 Price List Item Sync Status Display

**File**: `src/admin/components/supplier-price-lists.tsx`

Update to show sync status:

```typescript
// Add sync status column to price list items table
const columns = [
  // ... existing columns
  {
    header: "Gross Price",
    cell: ({ row }) => formatCurrency(row.gross_price, row.currency_code)
  },
  {
    header: "Net Price",
    cell: ({ row }) => formatCurrency(row.net_price, row.currency_code)
  },
  {
    header: "Sync Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.price_sync_status === "success" && (
          <Badge color="green">Synced</Badge>
        )}
        {row.price_sync_status === "failed" && (
          <Badge color="red" title={row.price_sync_error}>Failed</Badge>
        )}
        {row.price_sync_status === "skipped" && (
          <Badge color="gray" title={row.price_sync_error}>Skipped</Badge>
        )}
        {row.price_sync_status === "pending" && (
          <Badge color="blue">Pending</Badge>
        )}
        {row.price_synced_at && (
          <Text size="small" className="text-ui-fg-muted">
            {formatDate(row.price_synced_at)}
          </Text>
        )}
      </div>
    )
  }
]
```

---

#### 4.3 Manual Sync Trigger

**File**: `src/admin/components/supplier-price-lists.tsx`

Add button to manually trigger sync:

```typescript
const handleManualSync = async (priceListId: string) => {
  try {
    const res = await fetch(`/admin/suppliers/price-lists/${priceListId}/sync-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_sync: true })
    })
    
    if (!res.ok) throw new Error("Failed to sync prices")
    const data = await res.json()
    
    toast.success(`Synced ${data.updated_count} variant prices`)
    refetch()
  } catch (e: any) {
    toast.error(e.message || "Failed to sync prices")
  }
}

// In the price list UI
<Button 
  variant="secondary" 
  size="small"
  onClick={() => handleManualSync(priceList.id)}
>
  Sync Prices to Variants
</Button>
```

---

### Phase 5: API Routes

#### 5.1 Manual Sync Endpoint

**File**: `src/api/admin/suppliers/price-lists/[id]/sync-prices/route.ts`

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncVariantPricesFromSupplierWorkflow } from "@/workflows"

type SyncPricesRequest = {
  force_sync?: boolean
  dry_run?: boolean
}

export const POST = async (
  req: MedusaRequest<{ id: string }, {}, SyncPricesRequest>,
  res: MedusaResponse
) => {
  try {
    const { id } = req.params
    const { force_sync = false, dry_run = false } = req.body
    
    const { result } = await syncVariantPricesFromSupplierWorkflow(req.scope).run({
      input: {
        supplier_price_list_id: id,
        force_sync,
        dry_run
      }
    })
    
    res.json({
      success: true,
      updated_count: result.updated_variants?.length || 0,
      items_processed: result.items_processed?.length || 0,
      dry_run
    })
  } catch (error) {
    console.error("Price sync failed:", error)
    res.status(500).json({
      error: "Failed to sync prices",
      message: error.message
    })
  }
}
```

---

### Phase 6: Testing & Validation

#### 6.1 Test Scenarios

Create integration tests:

**File**: `integration-tests/workflows/sync-supplier-pricing.spec.ts`

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { syncVariantPricesFromSupplierWorkflow } from "@/workflows"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("Supplier Pricing Sync", () => {
      it("should sync gross price to variant selling price", async () => {
        const container = getContainer()
        
        // Setup: Create supplier, price list, and variant
        // ...
        
        const { result } = await syncVariantPricesFromSupplierWorkflow(container).run({
          input: {
            supplier_price_list_id: priceList.id,
            force_sync: true
          }
        })
        
        expect(result.updated_variants).toHaveLength(1)
        
        // Verify variant price was updated
        const variant = await productModule.retrieveProductVariant(variantId, {
          relations: ["prices"]
        })
        
        expect(variant.prices[0].amount).toBe(10000) // €100.00
      })
      
      it("should prefer supplier with higher priority", async () => {
        // Test multi-supplier conflict resolution
      })
      
      it("should skip sync when overwrite is disabled", async () => {
        // Test overwrite protection
      })
    })
  }
})
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)
- [ ] Add environment variables and configuration
- [ ] Create database migration for supplier pricing fields
- [ ] Add sync tracking fields to `supplier_price_list_item`
- [ ] Create `syncVariantPricesFromSupplierWorkflow`
- [ ] Create `resolveVariantPricingConflictsStep`
- [ ] Create `updatePriceListItemSyncStatusStep`
- [ ] Test workflow with sample data

### Phase 2: Variant Auto-Creation (Week 2)
- [ ] Create `createVariantsFromSupplierPriceListWorkflow`
- [ ] Create `findOrCreateProductForPartNumbersStep`
- [ ] Create `linkVariantsToPriceListItemsStep`
- [ ] Handle edge cases (duplicate SKUs, missing products)
- [ ] Test with orphaned part numbers

### Phase 3: Integration (Week 2-3)
- [ ] Integrate with existing `uploadSupplierPriceListWorkflow`
- [ ] Add conditional execution based on config flags
- [ ] Test end-to-end price list upload → variant creation → price sync
- [ ] Handle rollback scenarios

### Phase 4: Admin UI (Week 3)
- [ ] Create `SupplierPricingSettingsSection` component
- [ ] Add sync status display to price list items table
- [ ] Add manual sync trigger button
- [ ] Test UI interactions

### Phase 5: API Routes (Week 3)
- [ ] Create manual sync endpoint
- [ ] Add dry-run capability
- [ ] Add proper error handling and logging
- [ ] Document API endpoint

### Phase 6: Testing (Week 4)
- [ ] Write integration tests
- [ ] Write unit tests for conflict resolution
- [ ] Manual QA testing
- [ ] Performance testing with large price lists

### Phase 7: Documentation & Deployment (Week 4)
- [ ] Document configuration options
- [ ] Create user guide for pricing settings
- [ ] Update deployment scripts
- [ ] Deploy to staging
- [ ] Monitor and validate in production

---

## Recommended Configuration Strategy

### For Your Garage Use Case

```bash
# Primary supplier (e.g., "Main Distributor")
is_pricing_source: true
pricing_priority: 10
auto_sync_prices: true

# Secondary suppliers (fallback/comparison)
is_pricing_source: true
pricing_priority: 50
auto_sync_prices: false  # Only sync manually

# Other suppliers (parts only, no pricing)
is_pricing_source: false
pricing_priority: 100
auto_sync_prices: false
```

### Conflict Resolution Example

If variant "ABC123" is offered by multiple suppliers:
1. Supplier A (priority 10, is_pricing_source=true) → **Wins** (used for variant price)
2. Supplier B (priority 50, is_pricing_source=true) → Tracked but not used
3. Supplier C (is_pricing_source=false) → Never used for pricing

---

## Edge Cases & Considerations

### 1. Currency Handling
- **Problem**: Price lists may have different currencies
- **Solution**: Only sync prices matching `DEFAULT_CURRENCY_CODE`, log warnings for others

### 2. Multiple Brands Same SKU
- **Problem**: Different brands may use same part number (e.g., "FILTER-123")
- **Solution**: Use brand-aware CSV parsing (already implemented), scope by supplier→brand link

### 3. Price Decreases
- **Problem**: What if new price list has lower prices?
- **Solution**: Always use latest price from highest-priority supplier (configurable with `OVERWRITE_EXISTING_PRICES`)

### 4. Zero or Negative Prices
- **Problem**: Invalid prices in CSV
- **Solution**: Skip items with `gross_price <= 0`, log error

### 5. Variant Without Product
- **Problem**: CSV has SKU but variant doesn't exist
- **Solution**: Auto-create workflow handles this (Phase 2)

### 6. Performance with Large Lists
- **Problem**: 10,000+ items in price list
- **Solution**: Batch processing (100 variants at a time), consider background job

---

## Monitoring & Observability

### Metrics to Track

1. **Sync Success Rate**
   ```sql
   SELECT 
     price_sync_status,
     COUNT(*) as count
   FROM supplier_price_list_item
   WHERE price_list_id = 'spl_123'
   GROUP BY price_sync_status
   ```

2. **Price Discrepancies**
   - Variants with multiple supplier prices
   - Large price deltas between suppliers

3. **Orphaned Part Numbers**
   - Items without `product_variant_id` after auto-creation

### Logging

Add structured logging to workflows:

```typescript
logger.info("Variant pricing sync started", {
  workflow: "sync-variant-prices-from-supplier",
  supplier_price_list_id: input.supplier_price_list_id,
  supplier_id: supplier.id,
  supplier_name: supplier.name
})

logger.info("Variant pricing sync completed", {
  variants_updated: result.updated_variants.length,
  items_processed: result.items_processed.length,
  success_count: result.items_processed.filter(i => i.status === "success").length,
  failed_count: result.items_processed.filter(i => i.status === "failed").length
})
```

---

## Migration Path

### For Existing Price Lists

Run backfill script to sync historical prices:

**File**: `src/scripts/backfill-variant-prices-from-suppliers.ts`

```typescript
import { ExecArgs } from "@medusajs/framework/types"
import { syncVariantPricesFromSupplierWorkflow } from "@/workflows"
import { PURCHASING_MODULE } from "@/modules/purchasing"

export default async function backfillVariantPrices({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const purchasingService = container.resolve(PURCHASING_MODULE)
  
  // Get all active price lists
  const priceLists = await purchasingService.listSupplierPriceLists({
    is_active: true
  })
  
  logger.info(`Found ${priceLists.length} active price lists to backfill`)
  
  for (const priceList of priceLists) {
    try {
      logger.info(`Processing price list: ${priceList.name}`)
      
      const { result } = await syncVariantPricesFromSupplierWorkflow(container).run({
        input: {
          supplier_price_list_id: priceList.id,
          force_sync: true // Override existing prices
        }
      })
      
      logger.info(`Completed ${priceList.name}:`, {
        updated: result.updated_variants?.length || 0,
        processed: result.items_processed?.length || 0
      })
    } catch (error) {
      logger.error(`Failed to process ${priceList.name}:`, error)
    }
  }
  
  logger.info("Backfill completed")
}
```

Run with:
```bash
npx medusa exec ./src/scripts/backfill-variant-prices-from-suppliers.ts
```

---

## Success Criteria

This implementation is successful when:

1. ✅ **Price lists automatically update variant selling prices** with supplier gross prices
2. ✅ **Multi-supplier conflicts are resolved** using configurable priority system
3. ✅ **Unknown part numbers create variants** automatically during import
4. ✅ **Admin UI shows sync status** and allows manual triggers
5. ✅ **System is configurable** via environment variables per supplier
6. ✅ **Performance is acceptable** (< 5 seconds for 1000-item price list)
7. ✅ **Error handling is robust** with detailed logging and rollback capability
8. ✅ **Leverages Medusa native workflows** (upsertVariantPricesWorkflow, etc.)

---

## Future Enhancements (Post-MVP)

1. **Advanced Pricing Rules**
   - Apply markup percentages to gross prices
   - Customer-group specific pricing (B2B vs retail)
   - Regional pricing variations

2. **Price Change Notifications**
   - Alert on significant price increases/decreases
   - Email notifications to admins

3. **Historical Price Tracking**
   - Store price history for analytics
   - Track supplier pricing trends

4. **Bulk Operations**
   - Batch sync multiple suppliers at once
   - Compare pricing across suppliers

5. **API for External Systems**
   - Webhook on price changes
   - REST API for price queries

---

## Conclusion

This plan provides a complete, Medusa-native solution for syncing supplier gross prices to variant selling prices, with robust conflict resolution, auto-variant creation, and comprehensive admin tooling. The phased approach allows incremental implementation and testing, with clear success criteria and monitoring capabilities.

The implementation leverages Medusa's native workflows (`upsertVariantPricesWorkflow`, `createProductVariantsWorkflow`) rather than reinventing the wheel, ensuring compatibility with future Medusa updates and maintaining best practices throughout.

