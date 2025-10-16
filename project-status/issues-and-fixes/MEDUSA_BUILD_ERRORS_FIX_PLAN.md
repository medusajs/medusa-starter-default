## Medusa build errors: root causes and fix plan

This document groups the TypeScript build errors you shared, explains root causes, and lays out a pragmatic sequence of edits to resolve them following Medusa v2 patterns.

### 1) Unknown DI types from req.scope.resolve / container.resolve
Errors: "XService is of type unknown" in many routes/workflows/steps (brands, machines, technicians, rentals, warranties, invoicing, etc.).

Root cause:
- The Medusa DI container returns `unknown` unless the token is a known built‑in (e.g., `Modules.PRODUCT`) or you augment typings for your custom module key.

Fix plan:
- For custom modules, add declaration merging so `scope.resolve("<module-key>")` is typed:
  - Create `src/types/modules.d.ts` and register each module service under its key used with `Module(<key>, { service })`.
  - Example keys from your code: `brands`, `machines`, `technicians`, `purchasing`, `invoicing`, `rentals`, `service_orders`, `stock_location_details`, `user_preferences`, `warranties`.
- Short-term (incremental) in files with errors, cast explicitly where needed: `const brandsService = req.scope.resolve(BRANDS_MODULE) as BrandsService`.
- Prefer built-ins via `Modules.*` to inherit typings automatically (e.g., `const fileService = container.resolve(Modules.FILE)`).

Deliverables:
- Add `src/types/modules.d.ts` declaration merging for all custom modules.
- Replace ad-hoc `any` with concrete service interfaces, keep explicit `as` casts only where unavoidable.

### 2) Module index `definition` property not supported
Errors in `src/modules/*/index.ts`: object literal may only specify known properties, and `definition` does not exist.

Root cause:
- The `Module()` factory in your current Medusa version expects `{ service }`. The `definition` config you added is not part of the accepted options in this version.

Fix plan:
- Update all module `index.ts` to:
  - `export default Module(<KEY>, { service: <ServiceClass> })`
  - Keep the `export const <KEY> = "..."` for DI, but remove `definition`.

Files:
- `src/modules/brands/index.ts`, `src/modules/invoicing/index.ts`, `src/modules/machines/index.ts`, `src/modules/purchasing/index.ts`, `src/modules/rentals/index.ts`, `src/modules/service-orders/index.ts`, `src/modules/stock-location-details/index.ts`, `src/modules/technicians/index.ts`, `src/modules/user-preferences/index.ts`, `src/modules/warranties/index.ts`.

### 3) Arrays inferred as never[] and property access on never
Errors (multiple): pushing into arrays or accessing properties then TS says `never`.

Root cause:
- Unannotated arrays default to `never[]` when initialized empty.

Fix plan:
- Annotate arrays and items:
  - `let brands: BrandDTO[] = []`
  - `const enrichedVariants: ProductVariantDTO[] = []`
  - `const inventoryUpdates: InventoryUpdateInput[] = []`
  - Define small local types when DTOs don't exist, then refactor to shared types later.

### 4) Brands search route typing and filters
Errors in `src/api/admin/brands/search/route.ts` about `is_oem` and `authorized_dealer` on `never`.

Root cause:
- `let brands = []` inferred as `never[]` and missing DTO types.

Fix plan:
- Type `brands` as `BrandDTO[]` (or an interface with fields you use), and ensure the Brands model/DTO includes `is_oem` and `authorized_dealer`. If they are metadata, use `brand.metadata?.is_oem` and `brand.metadata?.authorized_dealer` consistently.

### 5) Invoice PDF step and route – incorrect step invocation and scope issues
Errors: `.invoke` does not exist on StepFunction; missing `file` identifier; Buffer `.toString('base64')` typing; returning `.html` filename.

Root cause and fixes:
- Step invocation: wrap the step in a workflow and call `workflow.run({ ... }, { container })`, or call step with its supported API (no `.invoke`). Best practice is a small one‑step workflow.
- Variable scope: `file` defined in try block then used after; move invoice update and `StepResponse` creation inside the block; return `file.id` for compensation.
- Base64 encoding: `page.pdf()` may return `Uint8Array`. Use `Buffer.from(pdfBuffer).toString("base64")` (Node runtime) or supply a Buffer directly if file service accepts it.
- Response filename: ensure `.pdf` extension.

Fix plan, actionable:
- Create `generate-invoice-pdf.workflow.ts` that calls the step and returns `{ file, invoice }`.
- In route, replace `.invoke` with `await generateInvoicePdfWorkflow.run({ invoice_id }, { container: req.scope })`.
- In step, fix `file` scoping and base64 handling; update the invoice inside the step after file creation.

### 6) Invoices API – DTO union types
Errors in `src/api/admin/invoices/route.ts` that `invoice_type` is `string | undefined` but expected specific unions.

Fix plan:
- Guard and map input to allowed unions:
  - For orders: only `"product_sale" | "mixed"`.
  - For service orders: only `"service_work" | "mixed"`.
- Reject/normalize others with 400 and clear message. Consider zod schemas per route.

### 7) Purchasing module – types, imports, and relations
Errors: wrong import paths for services; `never` all over; accessing `item.price_list` where `item` typed `never`; relation `delete` option in model; workflow input shape mismatch.

Fix plan:
- Fix imports in steps: replace `../services/purchasing.service`/`../services/supplier.service` with the actual `src/modules/purchasing/service` (or use DI resolution via `container.resolve("purchasing")`).
- Type arrays and items (`SupplierPriceListItemDTO[]`, `PurchaseOption[]`, etc.).
- Replace model config `delete: ["supplier_price_list_items"]` with correct cascade or relation options using the data modeling DSL (e.g., establish a relation with `.cascade(["delete"])` on the relation definition, per your version).
- In `create-purchase-order` workflow: step expects `product_title` and possibly `supplier_sku`. Either:
  1) Enrich `input.items` before calling the step by querying product module; or
  2) Relax the step DTO to accept minimal fields and fetch titles inside the step. Prefer enrichment in the step for cohesion.
- Remove unsupported fields like `overwrite_existing` from a workflow input where it is not in the declared `WorkflowInput`.

### 8) Rentals model default timestamp
Error: `model.dateTime().default("now")` expects a `Date`.

Fix plan:
- Use a function default: `.default(() => new Date())`.

### 9) Inventory/stock locations method mismatch
Error: `listStockLocations` not on `IInventoryService`.

Root cause:
- Stock locations are in their own module. Inventory module does not expose that method.

Fix plan:
- Use `container.resolve(Modules.STOCK_LOCATION)` to list stock locations, or use `query.graph({ entity: "stock_location", ... })`.

### 10) ProductVariant pricing in setup script
Errors: `ProductVariantDTO.prices` does not exist; `UpdateProductVariantDTO` rejects `prices`.

Root cause:
- In v2, pricing is in the Pricing module; variants don’t carry a `prices` array in the DTO.

Fix plan:
- For seed/setup, create or upsert prices via the Pricing module (price lists or direct prices), not via product variants.

### 11) Scripts: computed property with module linkable, and many never/unknown types
Errors: computed property name not acceptable; lots of `never` due to untyped arrays; `answer` of type unknown.

Fix plan:
- Use link workflows/utilities (e.g., `createLinks`) instead of constructing raw link objects with computed keys; or use string keys if your linkable constants aren’t strings.
- Type prompt/answers as `string` and normalize.
- Add types to arrays/maps used in consolidation scripts.

---

## Step-by-step implementation order

1) Fix module index files and add DI typings:
- Remove `definition` blocks from all `src/modules/*/index.ts`.
- Add `src/types/modules.d.ts` declaration merging to type your custom DI keys → resolves the many `unknown` errors.

2) Brands API fixes:
- In `src/api/admin/brands/[id]/route.ts` and `search/route.ts`, annotate service and arrays. Ensure model/DTO contains `is_oem`/`authorized_dealer` or switch to `metadata` access.

3) Invoice PDF generation:
- Create a workflow wrapper for `generate-invoice-pdf` step and call `.run` from the route. Fix `file` scoping and base64 conversion in the step. Update response filename to `.pdf`.

4) Invoices API DTO unions:
- Add input validation/mapping for `invoice_type` unions for order vs service order endpoints.

5) Purchasing module and steps:
- Correct imports to the real service path or use DI resolve. Type arrays, items, and map shapes. Fix the supplier price list model relation configuration. Update `create-purchase-order` to provide titles or fetch them inside.

6) Rentals model default:
- Change dateTime default to a function.

7) Inventory/stock locations:
- Replace `inventoryService.listStockLocations` with stock location module call or a graph query.

8) Scripts hygiene:
- Type arrays and variables; replace computed link keys with link utilities; adjust pricing writes to use Pricing module.

9) Rebuild and iterate:
- Run `npx medusa build` locally. Address any remaining residual type errors with targeted annotations or refining DTOs.

---

## Code change checklist (concise)

- Remove unsupported `definition` from all module `index.ts`.
- Add `src/types/modules.d.ts` to type custom module tokens in DI.
- Replace `.invoke` calls with `workflow.run` and/or correct step invocation.
- Fix `generate-invoice-pdf` step: scope of `file`, base64 conversion, and return type; update invoice inside the step.
- Add DTO-accurate unions and validation for invoice create endpoints.
- Annotate arrays to avoid `never[]` and type variables that can be `null`.
- Replace bad model options: use relation cascade configs and `dateTime().default(() => new Date())`.
- Use Stock Location module or graph for locations; don’t assume Inventory exposes it.
- Use Pricing module for prices; don’t write `prices` on variants.
- Fix broken imports in purchasing steps to reference the actual service/module.

---

## Notes on Medusa v2 best practices

- Prefer `Modules.*` constants for built-in services and declaration merging for custom modules to keep DI typed.
- Encapsulate multi-step operations in workflows and call via `.run` from HTTP routes; keep side-effects and compensation inside steps.
- Use the `query.graph` helper for flexible, typed querying instead of ad-hoc service lists where convenient.
- Keep DTOs narrow and explicit; use unions rather than `string` for domain enums.
- Avoid storing cross-cutting flags as top-level fields unless they are part of your data model; otherwise use `metadata` consistently.

---

## Post-fix validation

- Build: `npx medusa build`
- Lint: ensure no new linter errors in changed files
- Smoke test affected routes:
  - Brands CRUD and search
  - Invoices: create from order/service order and PDF generation
  - Purchasing: create purchase order workflow
  - Rentals model migrations
  - Orders: reservations flow (stock locations retrieval)


