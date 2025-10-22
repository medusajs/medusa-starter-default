# Production Build Fix - Executable Task List

**Status:** ❌ 40 TypeScript errors + 1 critical frontend error
**Priority:** All must be resolved before production deployment

---

## CRITICAL: Frontend Build Failure

### Task 1: Fix Frontend Build Error
**Error:** `Cannot add property 0, object is not extensible`
**Location:** Frontend compilation (Vite/Tailwind CSS)
**Priority:** CRITICAL - Blocks deployment

**Investigation Steps:**
```bash
# Check for problematic admin customizations
ls -la src/admin/

# Clear Tailwind cache
rm -rf .medusa/client/

# Check for circular imports in admin widgets
grep -r "import.*from.*'\.\./\.\./'" src/admin/
```

**Likely Causes:**
- Custom admin widgets with frozen/sealed objects
- Tailwind CSS class generation issue with dynamic classes
- React component mutation of immutable props
- Vite build configuration conflict

**Files to Check:**
- `src/admin/` - All custom widgets and components
- `src/admin/components/modals/add-line-item-modal.tsx` (recently modified)
- Admin route extensions
- Any code that modifies `Object.freeze()` or `Object.seal()` data

---

## Backend TypeScript Errors (40 total)

### BRANDS SERVICE (6 errors)

#### Task 2: Fix BrandsService.retrieve
**File:** `src/api/admin/brands/[id]/route.ts:24:39`
**Error:** Property 'retrieve' does not exist on type 'BrandsService'
**Fix:** Use correct method name (likely `retrieve` is not exposed, use `list` with filter or add to service)
```typescript
// Current (line 24):
const brand = await brandsService.retrieve(id)

// Fix Option 1 - Add method to service:
// src/modules/brands/service.ts - Add retrieve method

// Fix Option 2 - Use list with filter:
const [brand] = await brandsService.list({ id: [id] })
```

#### Task 3: Fix BrandsService.list
**File:** `src/api/admin/brands/[id]/route.ts:47:50`
**Error:** Property 'list' does not exist on type 'BrandsService'
**Fix:** Verify service extends proper base class with list method
```typescript
// Check src/modules/brands/service.ts
// Ensure service has list method or use listAndCount
```

#### Task 4: Fix BrandsService.update
**File:** `src/api/admin/brands/[id]/route.ts:59:39`
**Error:** Property 'update' does not exist on type 'BrandsService'
**Fix:** Add update method to BrandsService or use correct method name
```typescript
// src/modules/brands/service.ts - Add update method
```

#### Task 5: Fix BrandsService.delete
**File:** `src/api/admin/brands/[id]/route.ts:78:25`
**Error:** Property 'delete' does not exist on type 'BrandsService'
**Fix:** Add delete method to BrandsService
```typescript
// src/modules/brands/service.ts - Add delete method
```

#### Task 6: Fix BrandsService.searchBrands
**File:** `src/api/admin/brands/search/route.ts:21:36`
**Error:** Property 'searchBrands' does not exist on type 'BrandsService'
**Fix:** Add searchBrands method or use list with filters
```typescript
// src/modules/brands/service.ts - Add searchBrands method
```

#### Task 7: Fix BrandsService.listBrandsOrdered
**File:** `src/api/admin/brands/search/route.ts:42:36`
**Error:** Property 'listBrandsOrdered' does not exist on type 'BrandsService'
**Fix:** Add listBrandsOrdered method or use list with ordering
```typescript
// src/modules/brands/service.ts - Add listBrandsOrdered method
```

---

### INVOICES MODULE (3 errors)

#### Task 8: Fix Invoice Update Type
**File:** `src/api/admin/invoices/[id]/route.ts:90:11`
**Error:** updateData type mismatch with allowed invoice update fields
**Fix:** Filter updateData to only include allowed fields
```typescript
// Line 90 area - ensure updateData only contains:
// customer_email, customer_phone, payment_terms, notes,
// internal_notes, discount_amount
const allowedFields = {
  customer_email: updateData.customer_email,
  customer_phone: updateData.customer_phone,
  payment_terms: updateData.payment_terms,
  notes: updateData.notes,
  internal_notes: updateData.internal_notes,
  discount_amount: updateData.discount_amount,
}
```

#### Task 9: Fix Invoice Analytics Filter
**File:** `src/api/admin/invoices/analytics/route.ts:84:9`
**Error:** "invoice.status" not valid in RemoteQueryFilters for invoice_line_item
**Fix:** Adjust filter to use proper relation syntax or separate query
```typescript
// Line 84 - Fix filter:
// Either filter invoices first, then get line items
// Or use proper relation syntax for line item queries
```

#### Task 10: Fix Invoice Type Validation
**File:** `src/api/admin/invoices/route.ts:127:9`
**Error:** invoice_type string not assignable to "product_sale" | "mixed"
**Fix:** Add type validation before workflow call
```typescript
// Line 127:
const validInvoiceType = invoice_type as "product_sale" | "mixed" | undefined
input: {
  ...otherFields,
  invoice_type: validInvoiceType,
}
```

#### Task 11: Fix Service Order Invoice Type
**File:** `src/api/admin/invoices/route.ts:135:9`
**Error:** invoice_type string not assignable to "service_work" | "mixed"
**Fix:** Add type validation
```typescript
// Line 135:
const validInvoiceType = invoice_type as "service_work" | "mixed" | undefined
```

---

### PRODUCT VARIANTS - BRAND LINKING (2 errors)

#### Task 12: Fix variant brand_id type
**File:** `src/api/admin/products/variants/[id]/brand/route.ts:75:13`
**Error:** product_variant_id type mismatch
**Fix:** Update link creation to use proper type
```typescript
// Line 75:
// Check the expected type for product_variant_id in link creation
```

#### Task 13: Fix brand_id type
**File:** `src/api/admin/products/variants/[id]/brand/route.ts:76:13`
**Error:** brand_id type mismatch
**Fix:** Ensure both IDs are proper type for link table
```typescript
// Line 76:
// Verify link table schema and adjust types
```

---

### MACHINES MODULE (10 errors)

#### Task 14: Fix MachinesService.listMachines
**File:** `src/api/admin/machines/route.ts:40:36`
**Error:** Property 'listMachines' does not exist
**Fix:** Add method or use `list`
```typescript
// src/modules/machines/service.ts - Add listMachines or use list
```

#### Task 15: Fix MachinesService.create
**File:** `src/api/admin/machines/route.ts:116:39`
**Error:** Property 'create' does not exist
**Fix:** Add create method to service

#### Task 16: Fix MachinesService.retrieve
**File:** `src/api/admin/machines/[id]/route.ts:28:39`
**Error:** Property 'retrieve' does not exist
**Fix:** Add retrieve method or use list with ID filter

#### Task 17: Fix MachinesService.update (1)
**File:** `src/api/admin/machines/[id]/route.ts:66:39`
**Error:** Property 'update' does not exist
**Fix:** Add update method to MachinesService

#### Task 18: Fix MachinesService.delete
**File:** `src/api/admin/machines/[id]/route.ts:82:25`
**Error:** Property 'delete' does not exist
**Fix:** Add delete method to MachinesService

#### Task 19-23: Fix MachinesService methods in other routes
**Files:**
- `src/api/admin/machines/[id]/service-history/route.ts:21:36` - listMachineServiceOrders
- `src/api/admin/machines/serial-number/[serial]/route.ts:18:50` - list
- `src/api/admin/machines/stats/route.ts:10:43` - getTotalMachinesCount
- `src/api/admin/service-orders/[id]/machine/route.ts:77:39` - update
- `src/api/admin/service-orders/[id]/machine/route.ts:100:43` - getTotalMachinesCount

**Fix:** Add all missing methods to `src/modules/machines/service.ts`

---

### PURCHASING MODULE (4 errors)

#### Task 24: Fix PurchaseOrdersService.retrieve
**File:** `src/api/admin/purchasing/purchase-orders/[id]/route.ts:49:49`
**Error:** Property 'retrieve' does not exist
**Fix:** Add retrieve method to service

#### Task 25: Fix PurchaseOrdersService.update
**File:** `src/api/admin/purchasing/purchase-orders/[id]/route.ts:94:52`
**Error:** Property 'update' does not exist
**Fix:** Add update method to service

#### Task 26: Fix PurchaseOrdersService.delete
**File:** `src/api/admin/purchasing/purchase-orders/[id]/route.ts:110:28`
**Error:** Property 'delete' does not exist
**Fix:** Add delete method to service

#### Task 27: Fix SuppliersService.retrieve
**File:** `src/api/admin/purchasing/suppliers/[id]/route.ts:27:42`
**Error:** Property 'retrieve' does not exist
**Fix:** Add retrieve method to SuppliersService

---

### SERVICE ORDERS MODULE (7 errors)

#### Task 28: Fix ServiceOrdersService.getServiceOrder
**File:** `src/api/admin/service-orders/[id]/route.ts:62:48`
**Error:** Property 'getServiceOrder' does not exist
**Fix:** Add method or rename to retrieve

#### Task 29: Fix ServiceOrdersService.updateServiceOrder
**File:** `src/api/admin/service-orders/[id]/route.ts:102:48`
**Error:** Property 'updateServiceOrder' does not exist
**Fix:** Add method or use update

#### Task 30: Fix ServiceOrdersService.deleteServiceOrder
**File:** `src/api/admin/service-orders/[id]/route.ts:119:33`
**Error:** Property 'deleteServiceOrder' does not exist
**Fix:** Add method or use delete

#### Task 31: Fix ServiceOrdersService.listServiceOrdersWithFilters
**File:** `src/api/admin/service-orders/route.ts:69:48`
**Error:** Property 'listServiceOrdersWithFilters' does not exist
**Fix:** Add method to service

#### Task 32: Fix ServiceOrdersService.createServiceOrder
**File:** `src/api/admin/service-orders/route.ts:169:48`
**Error:** Property 'createServiceOrder' does not exist
**Fix:** Add method or use create

#### Task 33-34: Fix ServiceOrdersService analytics methods
**Files:**
- `src/api/admin/service-orders/analytics/recent/route.ts:11:48` - getRecentServiceOrders
- `src/api/admin/service-orders/analytics/revenue-cost/route.ts:26:48` - getRevenueAndCostByDateRange

**Fix:** Add analytics methods to service

---

### TECHNICIANS MODULE (4 errors)

#### Task 35: Fix TechniciansService.retrieve
**File:** `src/api/admin/technicians/[id]/route.ts:26:45`
**Error:** Property 'retrieve' does not exist
**Fix:** Add retrieve method

#### Task 36: Fix TechniciansService.update
**File:** `src/api/admin/technicians/[id]/route.ts:60:45`
**Error:** Property 'update' does not exist
**Fix:** Add update method

#### Task 37: Fix TechniciansService.delete
**File:** `src/api/admin/technicians/[id]/route.ts:75:28`
**Error:** Property 'delete' does not exist
**Fix:** Add delete method

#### Task 38: Fix TechniciansService.listTechniciansForBrand
**File:** `src/api/admin/technicians/by-brand/[brandId]/route.ts:13:45`
**Error:** Property 'listTechniciansForBrand' does not exist
**Fix:** Add method to service

---

### BRANDS-TECHNICIANS LINKING (2 errors)

#### Task 39: Fix technician_id type
**File:** `src/api/admin/technicians/[id]/certifications/route.ts:37:13`
**Error:** Type mismatch in link creation
**Fix:** Ensure proper type for link

#### Task 40: Fix brand_id type
**File:** `src/api/admin/technicians/[id]/certifications/route.ts:38:13`
**Error:** Type mismatch in link creation
**Fix:** Ensure proper type for link

---

## Execution Plan for Agents

### Phase 1: Service Methods (Priority 1)
**Target:** Add all missing CRUD methods to custom module services

1. **File:** `src/modules/brands/service.ts`
   - Add: `retrieve()`, `list()`, `update()`, `delete()`, `searchBrands()`, `listBrandsOrdered()`

2. **File:** `src/modules/machines/service.ts`
   - Add: `retrieve()`, `create()`, `update()`, `delete()`, `listMachines()`, `listMachineServiceOrders()`, `getTotalMachinesCount()`

3. **File:** `src/modules/purchasing/services/purchase-orders.ts`
   - Add: `retrieve()`, `update()`, `delete()`

4. **File:** `src/modules/purchasing/services/suppliers.ts`
   - Add: `retrieve()`

5. **File:** `src/modules/service-orders/service.ts`
   - Add: `getServiceOrder()`, `updateServiceOrder()`, `deleteServiceOrder()`, `createServiceOrder()`, `listServiceOrdersWithFilters()`, `getRecentServiceOrders()`, `getRevenueAndCostByDateRange()`

6. **File:** `src/modules/technicians/service.ts`
   - Add: `retrieve()`, `update()`, `delete()`, `listTechniciansForBrand()`

### Phase 2: Type Fixes (Priority 2)
**Target:** Fix type mismatches and validation

- Task 8: `src/api/admin/invoices/[id]/route.ts` - Filter update data
- Task 9: `src/api/admin/invoices/analytics/route.ts` - Fix query filter
- Task 10-11: `src/api/admin/invoices/route.ts` - Add type assertions
- Task 12-13: `src/api/admin/products/variants/[id]/brand/route.ts` - Fix link types
- Task 39-40: `src/api/admin/technicians/[id]/certifications/route.ts` - Fix link types

### Phase 3: Frontend Build (Priority CRITICAL)
**Target:** Fix frontend compilation error

- Task 1: Debug and fix `Cannot add property 0, object is not extensible`
  - Check `src/admin/components/modals/add-line-item-modal.tsx`
  - Review all admin customizations for object mutations
  - Clear build cache and rebuild

---

## Testing Checklist

After all fixes:
- [ ] `npm run build` completes without errors
- [ ] Backend compiles: `.medusa/server/` exists
- [ ] Frontend compiles: `.medusa/client/` exists
- [ ] Test each custom module API endpoint
- [ ] Test admin dashboard loads
- [ ] Test custom widgets render correctly
- [ ] Run `npx medusa develop` successfully
- [ ] Verify all workflows execute properly

---

## Quick Reference: Common Service Method Pattern

```typescript
// src/modules/YOUR_MODULE/service.ts
import { InjectManager, MedusaContext } from "@medusajs/framework/utils"

class YourService {
  async retrieve(id: string, config = {}, @MedusaContext() sharedContext = {}) {
    const [entity] = await this.list({ id: [id] }, config, sharedContext)
    if (!entity) {
      throw new Error(`Entity with id ${id} not found`)
    }
    return entity
  }

  async update(id: string, data: any, @MedusaContext() sharedContext = {}) {
    // Update logic
  }

  async delete(ids: string[], @MedusaContext() sharedContext = {}) {
    // Delete logic
  }
}
```

---

**Last Updated:** 2025-10-07
**Next Action:** Start with Phase 1 - Service Methods
