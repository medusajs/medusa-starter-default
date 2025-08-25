### Backend TypeScript build errors — grouped overview (2025-08-24)

This document summarizes the backend build/type-check errors from the latest run, groups them by theme, proposes the three most plausible root causes per group, and outlines concrete fixes. Each group also notes if it is blocking the build or only the runtime.

### Priority summary

- **P0 — Immediate (build/runtime breaking):**
  - Missing/invalid imports and moved files (TS2307)
  - Workflow step API misuse and undefined identifiers (Workflows SDK)
  - Routes calling service methods that don’t exist at runtime
- **P1 — High:**
  - DTO/enum drift vs. module APIs (schema/type mismatches)
  - Incorrect RemoteQuery filter shapes
- **P2 — Medium:**
  - Arrays inferred as `never[]`, narrowing/`null` typing mistakes
- **P3 — Lower (non-prod/test-only):**
  - Test harness (MedusaSuite) API changes
  - Minor script typing issues

Blocking legend:
- **Build-blocking:** prevents bundling/emit (e.g., missing files)
- **Runtime-blocking:** build may succeed, but code will crash at runtime

---

### Group 1 — Missing/invalid imports or moved files (TS2307)

Examples:
- `src/modules/purchasing/steps/add-item-to-draft-po.ts`: Cannot find `../services/purchasing.service`
- `src/modules/purchasing/steps/validate-supplier.ts`: Cannot find `../services/supplier.service`

Plausible causes:
- **(1)** Files were renamed/moved during refactor; import paths not updated.
- **(2)** Previously uncommitted files or renamed barrel exports were removed.
- **(3)** Path alias/tsconfig change removed support for prior import locations.

Fixes:
- Locate the new locations for the missing services and update imports accordingly.
- If replaced by module APIs, rewire steps to use the new module (e.g., container-resolved services or `@medusajs` module clients) instead of the legacy service files.
- If the services were intentionally removed, delete the dependent steps or replace them with the new flow.

Blocking: **Build-blocking (Yes).**

Priority: **P0**

---

### Group 2 — Workflow step API misuse and undefined identifiers

Examples:
- `src/api/admin/invoices/[id]/pdf/route.ts`: `generateInvoicePdfStep.invoke(...)` — `.invoke` not on `StepFunction`
- `src/workflows/invoicing/steps/generate-invoice-pdf.ts`:
  - `toString('base64')` flagged due to incorrect buffer typing
  - `file` identifier not defined, but used in `StepResponse`
  - Missing `$result` in workflow response shape errors elsewhere

Plausible causes:
- **(1)** Upgraded `@medusajs/workflows-sdk`; execution pattern changed (no direct `.invoke`, use composer/runner or `runStep`).
- **(2)** Step return contract changed to require `$result` or `StepResponse` usage adapted.
- **(3)** Loss of Node typings for buffers or accidental DOM lib overlap causing incorrect type of `pdfBuffer` and `File` symbol shadowing.

Fixes:
- Replace direct step invocation with the correct composer usage (e.g., build workflow via composer and call with runner) or use `runStep` within a workflow.
- Ensure step functions return via `new StepResponse(result, id)` and the workflow composes `$result` per SDK contract.
- Ensure `pdfBuffer` is typed as `Buffer` and Node types are available; remove accidental DOM `lib` overlap if present. Define the variable actually holding the uploaded file (e.g., `pdfFile`) and use it consistently.

Blocking: **Runtime-blocking (High).** Build may emit JS, but execution will fail.

Priority: **P0**

---

### Group 3 — Routes calling service methods that don’t exist

Examples:
- `src/api/admin/brands/*`: calls to `BrandsService.retrieve/list/update/delete/searchBrands/listBrandsOrdered`
- `src/api/admin/stock-location-details/*`: calls to `retrieve/update/delete/listAndCount/create`
- `src/api/admin/technicians/[id]/route.ts`: calls to `TechniciansService.retrieve/update/delete`
- `src/workflows/orders/create-order-with-reservations.ts`: `inventoryService.listStockLocations`

Plausible causes:
- **(1)** Service layer APIs renamed or replaced by module clients in new Medusa versions.
- **(2)** We switched from legacy services to modules, but routes weren’t updated.
- **(3)** Barrel re-exports dropped methods; types now reflect the new, smaller contracts.

Fixes:
- Identify the authoritative API (module vs service). Update routes to use the current module interface or implement adapter methods.
- If functionality exists elsewhere (e.g., `remoteQuery`, module client), refactor calls accordingly.
- If methods are legitimately missing, add them in the service implementation or remove unused routes.

Blocking: **Runtime-blocking (High).** Build may pass; routes will crash when invoked.

Priority: **P0**

---

### Group 4 — DTO/schema and enum drift vs module APIs

Examples:
- `src/api/admin/invoices/route.ts`: `invoice_type` expects specific union types (`"product_sale" | "mixed"`, etc.)
- `src/scripts/seed-machines.ts`: `status` expects specific enum (`"active" | "inactive" | "maintenance" | "sold"`)
- `src/scripts/setup-data.ts`: `ProductVariantDTO` no longer has `prices`; `updateProductVariants` call shape invalid
- `src/api/admin/products/variants/[id]/brand/route.ts`: object literal key/value shapes mismatched

Plausible causes:
- **(1)** Upgraded `@medusajs` module DTOs introduced stricter unions and removed fields.
- **(2)** Script code written against an earlier API surface.
- **(3)** Over-reliance on broad `string` types without mapping to new enums/constants.

Fixes:
- Map incoming strings to the new allowed enums before calling modules.
- Remove/replace outdated fields (`prices`) and call the correct endpoints for price updates.
- Align object literals to the expected input shapes (consult current types/SDK docs).

Blocking: **Runtime-blocking (Medium-High)** when executed; not necessarily build-blocking.

Priority: **P1**

---

### Group 5 — Incorrect RemoteQuery filter shapes

Examples:
- `src/api/admin/invoices/analytics/route.ts`: `"invoice.status"` isn’t an allowed filter on `invoice_line_item`

Plausible causes:
- **(1)** Filter paths changed; nested joins require `fields` and filters per entity scope.
- **(2)** Strategy changed (`joined` vs default) changing valid filter keys.
- **(3)** Typings tightened in `@medusajs/types`.

Fixes:
- Filter on valid fields for the root entity, or switch to joined strategy and use the proper nested filter path supported by the SDK.
- Verify filterable keys via the module/types docs and adjust accordingly.

Blocking: **Runtime-blocking (Medium)** if executed.

Priority: **P1**

---

### Group 6 — Arrays inferred as `never[]` and narrowing/`null` typing mistakes

Examples:
- Pushing to arrays typed as `never[]` across routes, services, steps, and scripts (`enrichedVariants`, `items`, `activeItems`, `allOptions`, `inventoryUpdates`, `reservations`, etc.)
- Variables declared as `null` and later assigned objects (`product`, `productVariant`) in `parse-price-list-csv.ts`

Plausible causes:
- **(1)** TS 5.x stricter inference for empty arrays without explicit generics.
- **(2)** Variables declared as `null` without union type (`T | null`).
- **(3)** Missing return type annotations causing cascading `never` inference.

Fixes:
- Initialize arrays with explicit generics, e.g., `const items: ItemDTO[] = []`.
- Declare nullable unions, e.g., `let product: ProductDTO | null = null`.
- Add function-level return and variable type annotations where inference fails.

Blocking: **Runtime-blocking (Medium)** where affected paths execute; not build-blocking.

Priority: **P2**

---

### Group 7 — Test harness (MedusaSuite) API changes

Examples:
- `src/modules/*/__tests__/*.spec.ts`: `MedusaSuiteOptions` no longer exposes `container`; computed property name errors using `BrandsModule.linkable.brand`

Plausible causes:
- **(1)** Upgraded `@medusajs/test-utils` or suite runner API.
- **(2)** `linkable.brand` type changed (e.g., not `string | symbol`).
- **(3)** Stricter TS checks in test environment.

Fixes:
- Update test suite callbacks to the new signature and accessors.
- Replace computed property with the correct key literal (e.g., use a typed string key) or cast to `as any` where appropriate in tests.

Blocking: **Not build-blocking for prod** (test-only), but blocks CI.

Priority: **P3**

---

### Group 8 — Model typing issues

Examples:
- `src/modules/rentals/models/rental-status-history.ts`: `.default("now")` expects `Date` not `string`

Plausible causes:
- **(1)** ORM/model API expects a `Date` instance or a factory for now.
- **(2)** Drift from prior permissive typings.
- **(3)** TS lib updates tightened the type.

Fixes:
- Use a proper default: `.default(() => new Date())` (or the ORM’s `now()` helper if available).

Blocking: **Runtime-blocking (Low-Medium)** when the model is used.

Priority: **P2**

---

### Group 9 — Workflow input shape mismatches

Examples:
- `src/modules/purchasing/workflows/create-purchase-order.ts`: `items` missing required fields (e.g., `product_title`) and step input mismatch
- `src/api/admin/suppliers/.../route.ts`: unexpected keys like `overwrite_existing`, `is_active`, `brand` in inputs

Plausible causes:
- **(1)** Workflow step input contracts updated to enforce richer item payloads.
- **(2)** Inputs copied from an older version of the flow.
- **(3)** Conflation of admin DTOs vs internal workflow DTOs.

Fixes:
- Extend the payload to include required fields or adjust to the simplified step signature per current SDK.
- Remove unrecognized properties from input objects; only send keys defined by the type.

Blocking: **Runtime-blocking (Medium-High)** where invoked.

Priority: **P1**

---

### Group 10 — Minor script typing issues

Examples:
- `src/scripts/migrate-brand-data.ts`: `answer` is `unknown` — need string coercion
- `src/scripts/consolidate-price-lists.ts`: property access on `never` due to untyped arrays
- `src/scripts/test-technicians-api.ts`: incorrect service update call signature

Plausible causes:
- **(1)** Stricter TS settings and updated types.
- **(2)** Empty array inference to `never[]`.
- **(3)** API changes in service/module clients.

Fixes:
- Narrow `unknown` via `String(answer)` and validate.
- Type arrays explicitly.
- Update service calls to the new signatures or module clients.

Blocking: **Not build-blocking.** Runtime risk if scripts are executed.

Priority: **P3**

---

### Recommended remediation plan (ordered)

1) **Unblock the build first (P0):**
   - Fix missing imports/paths in purchasing steps by pointing to existing services or replacing with module clients.
   - Refactor workflow step usages to the current Workflows SDK pattern; remove `.invoke`, fix `StepResponse`/$result, and correct buffer/file variables.
   - Update routes to use available service/module methods (or add adapters) for Brands, Stock Location Details, Technicians, and Inventory.

2) **Align schemas and queries (P1):**
   - Bring DTOs/enums and object literals into compliance with current module types.
   - Correct RemoteQuery filter keys/strategy.
   - Fix workflow inputs with missing required fields and remove unsupported keys.

3) **Stabilize typing (P2):**
   - Eliminate `never[]` by explicit generics, and correct `null` unions.
   - Fix model defaults expecting `Date`.

4) **Tidy tests and scripts (P3):**
   - Update MedusaSuite usage and computed property keys in tests.
   - Fix minor script typings and service call signatures.

### Notes on blocking status

- The build currently reports “completed with errors.” The TS2307 missing-module errors are typically build-blocking for bundlers and must be resolved.
- Most other issues are not hard build-blockers but are **runtime-blocking**: they will cause immediate failures when the affected endpoints/workflows/scripts run.


