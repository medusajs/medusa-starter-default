# TODO - Brand-aware Variants and Supplier Price Lists

This plan defines modular, incremental changes to support brand-specific product variants and ensure supplier price list uploads only affect variants of brands supplied by that supplier. It is structured to enable multiple developers/agents to work in parallel with minimal coupling, following native MedusaJS patterns (modules, links, workflows, Remote Query).

## Objectives
- Model brands as first-class entities and associate them at the variant level.
- Keep optional product-level brand(s) for convenience (OEM + aftermarket) without ambiguity.
- Enable suppliers to declare which brands they supply and constrain price list imports accordingly.
- Support optional brand scoping at the price list level (price list explicitly for one brand) in addition to supplier-level brand links.
- Preserve compatibility with existing purchasing flows and variant↔supplier mapping.

## Assumptions
- `Brand` model already exists in `src/modules/brands/models/brand.ts` and is exposed via `BrandsModule`.
- Existing link: product↔brand (`src/links/product-brand.ts`).
- Existing purchasing models: `Supplier`, `SupplierProduct`, `SupplierPriceList`, `SupplierPriceListItem`.
- Existing supplier↔variant mapping via `SupplierProduct` and price list processing workflows.

---

## Phase 0 — Foundations and Design Guards
- [x] Define acceptance criteria (see bottom) and add feature flag toggle
  - Acceptance criteria are finalized in the "Acceptance Criteria" section below.
  - Feature flag: `MEDUSA_FF_BRAND_AWARE_PURCHASING` (default: false)
    - Scope: brand-constrained CSV parsing/matching, optional price list `brand_id` input, supplier↔brand admin management UI, and new brand filters in admin.
    - Disabled behavior: link definitions can exist harmlessly, but enforcement and UI are hidden; imports behave as current (no brand constraints).
    - Implementation notes (native Medusa): read flag via environment (`process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING`) and, where available, expose through project config feature flags; guard API route handlers, workflows/steps, and admin visibility accordingly following patterns in `.medusa-source`.
- [x] Confirm `.medusa-source` patterns for link definitions and remote queries to keep consistency.
- [x] Confirm `.medusa-source` patterns for link definitions and remote queries to keep consistency.
- [x] Establish CSV template spec for suppliers (columns and validation rules).
  - Added `src/modules/purchasing/docs/price-list-csv.md` documenting required/optional columns, validation, and Medusa feature-flag behavior.
  - Added `src/modules/purchasing/docs/price-list-template.sample.csv` with a ready-to-use header and example rows.

Deliverables:
- Acceptance criteria doc (short README section).
- CSV template and sample file committed to `src/modules/purchasing/docs/`.

Owners: Architecture

---

## Phase 1 — Variant-level Brand Support (Product Module)
Goal: Each `product_variant` can be linked to exactly one `brand`.

- [x] Add variant↔brand link
  - Create `src/links/variant-brand.ts` using `defineLink`:
    - Left: `@medusajs/medusa/product`.linkable.productVariant
    - Right: `BrandsModule`.linkable.brand
    - `isList: false` (one brand per variant)
    - `filterable` on brand: `id`, `name`, `code`, `is_oem`, `authorized_dealer`
- [x] Expose brand via Remote Query
  - Ensure queries like `variants.brand.*` are retrievable.
  - Verify we can filter by `"brand.id"` and `"brand.code"` in Remote Query.
- [x] Admin UI (Product Variant form)
  - Add a “Brand” selector on variant create/edit pages.
  - If product-level brand(s) exist, use as default suggestion; allow overriding.
  - Add validation: prevent saving without a brand if required by business rules.
- [x] Product listing/search enhancements
  - Add filters for `brand` at product and variant grids (admin).

Deliverables:
- `src/links/variant-brand.ts`
- Admin: brand field on variant forms; brand filters on lists

Owners: Product Backend, Admin Frontend

---

## Phase 2 — Supplier-level Brand Capability
Goal: Suppliers declare which brands they supply; these links drive import constraints and purchasing rules.

- [x] Expose `supplier` as linkable
  - Update `src/modules/purchasing/index.ts` to export `linkable: { supplier: Supplier }` and include `models: [...]` for full registration.
- [x] Add supplier↔brand link
  - Create `src/links/supplier-brand.ts` using `defineLink`:
    - Left: Purchasing module linkable `supplier`
    - Right: Brands module linkable `brand`
    - `isList: true` (supplier can supply multiple brands)
    - `filterable` on brand same as above
- [x] Admin UI (Supplier page)
  - [x] Add “Brands” tab/section to manage linked brands (add/remove).
  - [x] Display read-only summary in supplier header (badges for brands).
- [x] API routes (optional, if not managed purely through Link UI)
  - [x] `GET /admin/suppliers/:id/brands` (Remote Query read)
  - [x] `POST/DELETE /admin/suppliers/:id/brands` to link/unlink (or use Link service directly from admin UI)

Deliverables:
- `src/links/supplier-brand.ts`
- Admin supplier brand management UI
- Optional admin routes (thin wrappers around Link)

Owners: Purchasing Backend, Admin Frontend

---

## Phase 3 — Price List Brand Scope (Model + Workflow)
Goal: Price lists may optionally target a single brand to hard-constrain imported rows.

- [x] Model change: `supplier_price_list`
  - Add nullable `brand_id` column to `src/modules/purchasing/models/supplier-price-list.model.ts`.
  - Migration added: `src/modules/purchasing/migrations/Migration20250822090000.ts` creating `brand_id` and a unique index `(supplier_id, brand_id, is_active)`.
- [x] API/Workflow inputs
  - Extended import route to accept optional `brand_id` and pass it to the workflow.
  - Persist `brand_id` on created price lists in `createPriceListStep`/`PurchasingService.createSupplierPriceList`.
  - Admin import UI updated to include optional brand selector.
- [x] Display
  - Show associated brand on price list detail/admin listing; add filter by brand.

Deliverables:
- DB migration (safe, additive)
- Route input validation update + UI change

Owners: Purchasing Backend, Admin Frontend

---

## Phase 4 — Brand-Constrained CSV Parsing and Matching
Goal: Ensure that imported rows resolve to variants only if they belong to allowed brands.

- [x] Update parsing step `src/modules/purchasing/steps/parse-price-list-csv.ts`
  - Resolve supplier’s allowed brand IDs via Remote Query on start; intersect with optional `brand_id`.
  - Filter variant lookup by `brand.id` when the feature flag is enabled; handle 0/ambiguous matches with clear errors.
  - Fallback to product-level selection filters variants to allowed brands and enforces disambiguation.
  - Populate `product_variant_id`, `product_id`, and preserve `variant_sku`.
- [x] Workflow wiring `src/modules/purchasing/workflows/upload-price-list-csv.ts`
  - Pass `supplier_id` and optional `brand_id` into the parse step context.
  - Parse errors are included in `upload_metadata` via the create step input.
- [x] Service upsert behavior
  - `PurchasingService.upsertSupplierProductFromPriceList` remains variant-id driven; no change needed.
  - Ensure no row proceeds without a resolved `product_variant_id`.

Deliverables:
- Updated parse step with Remote Query brand constraints
- Updated upload workflow
- CSV template/docs updated (optional `brand_code` column)

Owners: Purchasing Backend

---

## Phase 5 — Admin UX Improvements ✅ **COMPLETED**
Goal: Make brand context visible and manageable during daily operations.

- [x] Variant forms: add brand selector and validation; show current brand in variant tables.
  - ✅ Variant brand manager widget with edit functionality (`src/admin/widgets/variant-brand-manager.tsx`)
  - ✅ Product table brand filters (`src/admin/hooks/table/filters/use-product-table-filters.tsx`)
  - ✅ API routes for variant brand management (`src/api/admin/products/variants/[id]/brand/route.ts`)
- [x] Supplier page: Brands tab + counts of linked variants and price lists per brand. (basic linking UI added; counts TBD)
- [x] Price list import wizard: optional brand selector (pre-filtered by supplier brands) and CSV template hint.
- [x] Product detail: display variant-brand chips for clarity.
  - ✅ Brand overview widget with card layout (`src/admin/widgets/product-brand-overview.tsx`)
  - ✅ Compact brand chips widget (`src/admin/widgets/variant-brand-chips.tsx`)

Deliverables:
- Admin components updated with Medusa Admin patterns.

Owners: Admin Frontend

---

## Phase 6 — API/Remote Query Helpers and Routes ✅ **COMPLETED**
Goal: Thin endpoints to power admin screens and debug tools.

- [x] Query helpers
  - ✅ Reusable Remote Query snippets (`src/admin/hooks/api/remote-query-helpers.ts`)
  - ✅ React hooks for brand-related queries (`src/admin/hooks/api/brand-queries.ts`)
  - ✅ Helper functions for: variants by brand, supplier brands, price lists by brand, brand statistics
- [x] Optional routes
  - ✅ `GET /admin/brands/:id/variants` (paginated) (`src/api/admin/brands/[id]/variants/route.ts`)
  - ✅ `GET /admin/suppliers/:id/variants?brand_id=...` (from current graph or via link traversal) (`src/api/admin/suppliers/[id]/variants/route.ts`)
  - ✅ Handlers kept thin; delegated to Remote Query

Deliverables:
- Helper functions or hooks for remote query usage.

Owners: Backend

---

## Phase 7 — Data Migration & Backfill ✅ **COMPLETED**
Goal: Transition without breaking existing data.

- [x] Backfill variant brands
  - ✅ Smart assignment script with single-brand product logic (`src/scripts/backfill-variant-brands.ts`)
  - ✅ Handles edge cases: multiple brands, no brands, existing assignments
  - ✅ Batch processing with comprehensive logging and dry-run mode
- [x] Backfill supplier brands
  - ✅ Intelligent inference from SupplierProduct relationships (`src/scripts/backfill-supplier-brands.ts`)
  - ✅ Configurable thresholds and validation rules
  - ✅ Avoids duplicate links and handles edge cases
- [x] Write reversible scripts and log changes
  - ✅ Combined migration runner with safety features (`src/scripts/migrate-brand-data.ts`)
  - ✅ Comprehensive documentation and usage guide (`src/scripts/README-migration.md`)
  - ✅ Dry-run by default, detailed logging, error handling, and result reporting

Deliverables:
- Safe scripts for backfill with dry-run option.

Owners: Data Eng / Backend

---

## Phase 8 — Testing Strategy
Goal: Ensure reliability across parsing and linking.

- [ ] Unit tests
  - Variant↔brand link creation and retrieval.
  - Supplier↔brand link management.
  - CSV parse logic with allowed brand constraints (0/1/ambiguous cases).
- [ ] Integration tests
  - Price list upload end-to-end with supplier brand constraints.
  - Admin routes (if added): supplier brands get/add/remove.
- [ ] E2E/cypress (optional)
  - Admin flows for supplier-brand assignment and price list import.

Deliverables:
- Tests under `integration-tests/` and module-specific test dirs.

Owners: QA / Backend / Frontend

---

## Phase 9 — Documentation & Operationalization
Goal: Smooth handover and maintenance.

- [ ] Update README in `src/modules/brands/` and `src/modules/purchasing/`.
- [ ] Add CSV format doc with examples and edge-case guidance.
- [ ] Add troubleshooting guide for ambiguous SKU/brand matches.

Deliverables:
- Docs committed and linked from admin.

Owners: Tech Writing / Backend

---

## Phase 10 — Monitoring & Performance
Goal: Ensure import runs are observable and efficient.

- [ ] Add logging around parse/match decisions and summary metrics.
- [ ] Consider batching Remote Query calls in parse step and caching brand lists per run.
- [ ] Add basic dashboards or logs parsing script.

Deliverables:
- Logging improvements and optional dashboards.

Owners: Platform / Backend

---

## Workstream Breakdown (Parallelizable)
Use these work items to distribute across developers/agents.

1) Backend — Product/Variant Brand
- [ ] Implement `src/links/variant-brand.ts` and verify Remote Query filters
- [ ] Add seed/backfill script for variant brands

2) Backend — Supplier Brands & Index
- [ ] Update `src/modules/purchasing/index.ts` linkable export for `supplier`
- [ ] Implement `src/links/supplier-brand.ts`
- [ ] Optional admin routes for supplier brand CRUD

3) Backend — Price List Brand Scope
- [ ] Add `brand_id` to `supplier_price_list` + migration
- [ ] Update import route to accept `brand_id` and persist
- [ ] Update parse step to enforce supplier/price-list brand constraints
- [ ] Update upload workflow metadata and error reporting

4) Admin Frontend
- [ ] Variant brand selector + list filter
- [ ] Supplier brands management UI
- [ ] Price list import wizard brand selector + CSV hints
- [ ] Product detail brand chips

5) QA & Docs
- [ ] Tests for linking and parsing constraints
- [ ] CSV template and troubleshooting docs

---

## Acceptance Criteria
- Brand can be assigned per variant and queried via Remote Query; product-level brand link remains optional.
- Suppliers can be linked to brands; UI to manage the links exists.
- Price list import only updates variants whose brand is supplied by the supplier; if `brand_id` is specified on the price list, import is limited to that brand.
- CSV imports produce clear error messages for missing and ambiguous brand matches; summary is stored on the price list upload metadata.
- Existing purchasing flows (supplier products, PO) remain functional.

---

## Notes & Risks
- Variant SKU collisions across brands are expected; enforced disambiguation is required.
- Consider requiring either `brand_id` on the price list or `brand_code` per row for high-collision suppliers.
- Large imports should batch Remote Query calls and use caching to avoid timeouts.

---

Last updated: This session — Added detailed plan for brand-aware variants and supplier brand-scoped price list uploads.