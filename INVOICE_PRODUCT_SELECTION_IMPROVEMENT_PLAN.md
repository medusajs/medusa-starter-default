# Invoice Line Item Product Selection Improvement Plan

## Overview
This plan outlines the improvement of the invoice detail page's "Add Line Item" modal to enable validated product selection from the MedusaJS product module using a search and table-based approach.

## Verified with Medusa MCP

**Key Findings:**
- ✅ **DataTable Component**: Use `@medusajs/ui` DataTable with `useDataTable` hook for product listing
- ✅ **FocusModal**: Continue using FocusModal for modal dialogs (already implemented)
- ✅ **Tanstack Query**: Use `useQuery` for data fetching with proper caching
- ✅ **Search Functionality**: Implement via `DataTable.Search` component with state management
- ✅ **Pagination**: Use `DataTable.Pagination` for large product catalogs
- ✅ **Product Fetching**: Use standard fetch or SDK to call `/admin/products` with query parameters

**Documentation References:**
- [Data Table - Admin Components](https://docs.medusajs.com/resources/admin-components/components/data-table)
- [DataTable with Data Fetching Example](https://docs.medusajs.com/resources/admin-components/components/data-table#example-datatable-with-data-fetching)
- [Focus Modal](https://docs.medusajs.com/ui/components/focus-modal)
- [Configure Search in DataTable](https://docs.medusajs.com/ui/components/data-table#configure-search-in-datatable)

## Current State Analysis

**File:** `src/admin/components/modals/add-line-item-modal.tsx`

**Current Issues:**
1. Manual text input for product details (title, description, price)
2. No validation against actual products in the product module
3. No product search or browsing capability
4. Risk of data inconsistency and typos
5. No product variant selection support

## Proposed Solution

### Architecture

Replace the manual form fields with a two-step modal flow:

**Step 1: Product Selection**
- DataTable with product search functionality
- Display product thumbnail, title, SKU, and price
- Support for product variant selection
- Pagination for large catalogs

**Step 2: Line Item Details**
- Pre-filled product information (title, description, unit price)
- Editable quantity
- Optional price override
- Tax rate configuration

### Implementation Steps

#### 1. Create Product Selection Component

**File:** `src/admin/components/modals/product-selection-table.tsx`

**Features:**
- Use `useDataTable` hook from `@medusajs/ui`
- Implement state management for:
  - Search query (`useState<string>`)
  - Pagination (`useState<DataTablePaginationState>`)
  - Selected product (`useState<Product | null>`)
- Fetch products using `useQuery`:
  ```typescript
  const { data, isLoading } = useQuery({
    queryFn: () => fetch(`/admin/products?limit=${limit}&offset=${offset}&q=${search}`),
    queryKey: ["products", limit, offset, search]
  })
  ```
- Define columns:
  - Thumbnail image
  - Product title
  - SKU
  - Status
  - Default variant price
  - Select action button

**DataTable Configuration:**
```typescript
const table = useDataTable({
  columns,
  data: data?.products || [],
  getRowId: (row) => row.id,
  rowCount: data?.count || 0,
  isLoading,
  pagination: {
    state: pagination,
    onPaginationChange: setPagination,
  },
  search: {
    state: search,
    onSearchChange: setSearch,
  },
})
```

#### 2. Create Variant Selection Component

**File:** `src/admin/components/modals/variant-selection-list.tsx`

**Purpose:** When a product has multiple variants, allow user to select specific variant

**Features:**
- Display variants in a list or table format
- Show variant options (size, color, etc.)
- Display variant-specific SKU and price
- Select button for each variant

#### 3. Update Add Line Item Modal

**File:** `src/admin/components/modals/add-line-item-modal.tsx`

**Changes:**
- Add modal step state: `'product-selection' | 'variant-selection' | 'line-item-details'`
- Conditional rendering based on current step
- Product/variant selection fills form with validated data
- Keep existing form for quantity and price adjustments
- Add "Back" navigation between steps

**New State Variables:**
```typescript
const [step, setStep] = useState<'product-selection' | 'variant-selection' | 'line-item-details'>('product-selection')
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
```

**Modal Flow:**
1. **Product Selection Step:**
   - Render ProductSelectionTable component
   - On product select:
     - If product has single variant → Auto-select, move to line-item-details
     - If product has multiple variants → Move to variant-selection step

2. **Variant Selection Step:**
   - Render VariantSelectionList component
   - Display variants of selected product
   - On variant select → Move to line-item-details step
   - "Back" button returns to product-selection

3. **Line Item Details Step:**
   - Pre-fill form with product/variant data:
     ```typescript
     title: selectedVariant?.title || selectedProduct?.title
     description: selectedProduct?.description
     unit_price: selectedVariant?.price || selectedProduct?.variants[0]?.price
     item_type: 'product'
     ```
   - Allow quantity adjustment
   - Optional price override (with warning)
   - Tax rate configuration
   - "Back" button returns to variant-selection or product-selection
   - "Add to Invoice" button submits

#### 4. Add Product Type Support

**Enhancement:** Support adding non-product items (service, labor, shipping)

**Implementation:**
- Add item type selector at modal start
- If type is "product" → Show product selection flow
- If type is "service", "labor", "shipping" → Show manual form entry
- Toggle between validated product selection and free-form entry

#### 5. API Integration

**Endpoints to Use:**
- `GET /admin/products` - List products with search, pagination
  - Query params: `limit`, `offset`, `q` (search), `status`
- Product data structure includes variants by default

**No Backend Changes Required** - Use existing Medusa product endpoints

#### 6. UI/UX Enhancements

**Visual Improvements:**
- Show product thumbnails in table using `<Thumbnail>` component
- Display product status badges
- Show variant count badge for multi-variant products
- Highlight selected product/variant
- Loading states for data fetching
- Empty state when no products found
- Error handling for failed fetches

**Accessibility:**
- Keyboard navigation in table
- Row click to select
- Focus management between modal steps
- Proper ARIA labels

### Data Structure

**Product Selection Payload:**
```typescript
interface SelectedProductData {
  product_id: string
  variant_id: string
  title: string
  description?: string
  unit_price: number
  quantity: number
  tax_rate: number
  item_type: 'product' | 'service' | 'labor' | 'shipping'
}
```

### File Structure

```
src/admin/components/modals/
├── add-line-item-modal.tsx           # Main modal with step management
├── product-selection-table.tsx       # DataTable for product browsing
├── variant-selection-list.tsx        # Variant selection UI
└── line-item-form.tsx                # Quantity/price form (extracted)

src/admin/components/common/
├── thumbnail.tsx                      # Reusable thumbnail component (if not exists)
└── product-variant-badge.tsx         # Display variant options
```

## Benefits

1. **Data Integrity:** Products validated against actual product module
2. **User Experience:** Search and browse instead of manual typing
3. **Accuracy:** Pre-filled product information reduces errors
4. **Flexibility:** Support for both validated products and custom items
5. **Scalability:** Pagination handles large product catalogs
6. **Consistency:** Follows Medusa Admin UI patterns (DataTable, FocusModal)

## Implementation Checklist

- [x] Create `product-selection-table.tsx` with DataTable and useQuery
- [x] Implement search functionality with DataTable.Search
- [x] Add pagination support
- [x] Create `variant-selection-list.tsx` for multi-variant products
- [x] Update `add-line-item-modal.tsx` with step-based flow
- [x] Extract line item form to `line-item-form.tsx`
- [x] Add product thumbnail display
- [x] Implement item type toggle (product vs custom)
- [x] Add loading and error states
- [ ] Test with single-variant products
- [ ] Test with multi-variant products
- [ ] Test search functionality
- [ ] Test pagination with large catalogs
- [ ] Add keyboard navigation support
- [ ] Update invoice line items widget to display product references

## Alternative Approaches Considered

### 1. Combobox Product Search
**Pattern:** Single combobox with typeahead search
**Pros:** Simpler, faster for users who know product name
**Cons:** Harder to browse, limited information display
**Decision:** Not chosen - DataTable provides better browsing experience

### 2. Product Picker Modal (Custom)
**Pattern:** Custom modal with grid layout
**Pros:** Visual appeal, good for image-heavy catalogs
**Cons:** More development effort, not standard Medusa pattern
**Decision:** Not chosen - DataTable is standard Medusa pattern

### 3. Direct Product Import
**Pattern:** Link invoice line items directly to product variants
**Pros:** Strongest data integrity
**Cons:** Inflexible for custom pricing, services
**Decision:** Partial implementation - use product as template but allow overrides

## Future Enhancements

- [ ] Save recently used products for quick access
- [ ] Bulk product addition (select multiple products)
- [ ] Product filtering by category, type, status
- [ ] Quick add from order history
- [ ] Product price history tracking
- [ ] Discount application at line item level
- [ ] Product inventory checking before adding

## Estimated Effort

- **Development:** 6-8 hours
- **Testing:** 2-3 hours
- **Total:** 8-11 hours

## Testing Strategy

1. **Unit Tests:** Product selection logic, variant filtering
2. **Integration Tests:** Modal flow, API calls
3. **Manual Tests:**
   - Search with various queries
   - Pagination navigation
   - Single-variant product selection
   - Multi-variant product selection
   - Custom item entry
   - Price override
   - Edge cases (no products, API errors)

## Migration Notes

**Breaking Changes:** None - this is an enhancement, not a replacement

**Backward Compatibility:** Existing line items remain unchanged

**Data Migration:** Not required
