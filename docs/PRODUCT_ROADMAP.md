## Product Readiness Roadmap (Medusa Starter)

This roadmap consolidates findings across custom modules, admin screens, and native Medusa modules. It prioritizes critical fixes, resolves inconsistencies, and proposes enhancements to reach a solid MVP and production launch.

### Scope
- Custom modules: `purchasing`, `user-preferences`, `stock-location-details`, `machines`, `technicians`, `brands`, `service-orders`, `invoicing`, `warranties`, `rentals`
- Admin screens: lists, details, Kanban, widgets, modals
- API: `src/api/admin/**`
- Native modules: registered via `@medusajs/index`

## Module Inventory and Status

- Custom modules registered in `medusa-config.ts`:
  - `purchasing`, `user-preferences`, `stock-location-details`, `machines`, `technicians`, `brands`, `service-orders`, `invoicing`, `warranties`, `rentals`, plus native `@medusajs/index`.
  - Reference:
```19:65:medusa-config.ts
module.exports = defineConfig({
  projectConfig: { ... },
  modules: [
    { resolve: "./src/modules/purchasing" },
    { resolve: "./src/modules/user-preferences" },
    { resolve: "./src/modules/stock-location-details" },
    { resolve: "./src/modules/machines" },
    { resolve: "./src/modules/technicians" },
    { resolve: "./src/modules/brands" },
    { resolve: "./src/modules/service-orders" },
    { resolve: "./src/modules/invoicing" },
    { resolve: "./src/modules/warranties" },
    { resolve: "./src/modules/rentals" },
    { resolve: "@medusajs/index" },
  ],
})
```

- Native Medusa `@medusajs/index` provides: core commerce building blocks (products, variants, pricing, inventory, customers, orders, carts, regions, taxes, fulfillments, files, events, etc.). Ensure your custom flows integrate via module links/remote query where applicable.

## Critical Issues to Fix (Blockers)

1) Rentals: Admin UI present, API + migrations missing
- Evidence (Admin page expects `/admin/rentals` endpoints):
```1:102:src/admin/routes/rentals/page.tsx
const useRentals = () => {
  return useQuery({
    queryKey: ["rentals"],
    queryFn: async () => {
      const response = await fetch(`/admin/rentals`)
      ...
    },
  })
}
```
- Missing API routes (no matches under `src/api/admin/rentals`)
- Rentals migrations directory is empty, so DB tables won’t be created:
```1:1:src/modules/rentals/migrations
... no children found ...
```
- Actions:
  - Add `src/api/admin/rentals/route.ts` (list/create) and `src/api/admin/rentals/[id]/route.ts` (retrieve/update/delete) mapped to `RentalsModuleService`.
  - Generate initial migrations for `rental_order`, `rental_item`, `rental_status_history`.
  - Wire pagination, filtering, and search to match DataTable needs.
  - Align currency display to EUR (Admin shows `$` now).

2) Service Orders list/kanban: data source and pagination efficiency
- The list endpoint fetches all orders then slices in memory; this harms performance at scale:
```1:87:src/api/admin/service-orders/route.ts
// Use the service method for consistency with detail view
const serviceOrders = await serviceOrdersService.listServiceOrdersWithLinks(filters)
// Apply pagination manually since we're using the service method
const paginatedOrders = serviceOrders.slice(Number(offset), Number(offset) + Number(limit))
```
- Actions:
  - Implement DB-level pagination: expose a `listAndCount...` service method with `filters`, `limit`, `offset`, and use it in the API so `count`, `limit`, `offset` are calculated by the DB.
  - Ensure Kanban uses the same server-side filtered data source as the list (active tab) with `tab="active"` consistently.
  - Remove console debugging in API and admin once verified.

3) Pricing unit inconsistencies (Invoices vs UI/logic)
- Invoices model comments indicate cents/bigNumber; logic and UI treat numbers as major units.
```38:46:src/modules/invoicing/models/invoice.ts
// Financial information (stored in cents for precision)
subtotal: model.bigNumber().default(0),
```
```114:129:src/modules/invoicing/service.ts
const subtotal = lineItems.reduce((sum, item) => sum + Number(item.total_price), 0)
const totalAmount = subtotal + taxAmount
return await this.updateInvoices({ subtotal, tax_amount: taxAmount, ... }, { id: invoiceId })
```
- Actions: Decide one standard (recommended: store in major units as number for custom domains, or consistently use minor units across all invoice fields and convert strictly at boundaries). Then:
  - Update model comments/types, calculations, and all admin displays to reflect the decision.
  - Add formatting helpers using `Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' })`.

4) Service Orders totals display likely inconsistent
- Admin list divides by 100:
```437:446:src/admin/routes/service-orders/page.tsx
cell: ({ getValue }) => {
  const cost = getValue() || 0
  return (
    <Text className="font-mono">
      €{(cost / 100).toFixed(2)}
    </Text>
  )
}
```
- Model stores `number` (not clearly minor units), and TODO history suggests removing divisions elsewhere. Confirm storage unit, then remove division if storing major units.

5) Missing destructive actions
- Service Orders delete in actions is a TODO:
```251:262:src/admin/routes/service-orders/page.tsx
// TODO: Add delete service order functionality
```
- Actions: Implement `DELETE /admin/service-orders/[id]` and wire confirmation + mutation.

## High-Value Improvements (MVP-hardening)

- Authorization and validation
  - Add request validation (DTO schemas) to custom admin endpoints and sanitize inputs.
  - Enforce Medusa auth/permissions around custom routes.

- Internationalization consistency
  - Ensure Admin uses the same currency and date formatting across modules (Belgium defaults). Rentals currently uses `$`.
  - API i18n helper exists:
```1:70:src/utils/i18n-helper.ts
export function createI18nContext(req: MedusaRequest): I18nContext { ... }
```
  - Consider surfacing a language toggle in admin and sending `x-medusa-language` header from frontend requests.

- Admin UX polish
  - Remove debug logs in production for service orders list.
  - Normalize DataTable patterns: URL-synced pagination/search for all lists (rentals currently uses local state).
  - Unify status badges and color mappings with translation lookups everywhere.

- Performance
  - Replace any list-then-slice patterns with DB `limit/offset` queries in APIs.
  - Ensure services expose `listAndCount` for heavy tables and apply proper indexes (id/status/date columns already indexed in several models).

- Data model/links
  - Machines already defines a joiner config; review other modules for cross-module link opportunities to leverage remote query efficiently.
  - Add missing indexes where frequent filters occur (e.g., `service_orders.status`, `created_at`). Many are covered in migrations; verify at DB level.

## Custom Module Reviews and Gaps

- Service Orders
  - Strong coverage: models, migrations, status history, items, time entries, comments, kanban, backlog/active tabs.
  - Gaps: API pagination at DB level, delete endpoint, finalize Kanban visibility alignment and remove debug logs (see TODO.md In Progress items).

- Invoicing
  - Good service methods: generate number, add line items, recalc totals, change status, analytics, overdue retrieval, customer history.
  - Gaps: Pricing unit decision + consistent formatting; confirm PDF pipeline and error handling in `/admin/invoices/[id]/pdf`.

- Purchasing
  - Robust: suppliers, price lists, import/processing, PO flows, receive/update inventory steps scaffolded.
  - Gaps: Ensure upload/CSV routes are protected, and add background jobs for long-running imports.

- Machines
  - Service offers useful finders and joiner config. Admin detail page implemented.
  - Gaps: Consider attachments (files/photos), and maintenance logs summary.

- Technicians
  - Minimal service. Admin list/detail implemented.
  - Gaps: Add availability calendar, skill tags, and utilization dashboards.

- Warranties
  - Workflow from service order present; comprehensive model/line items.
  - Gaps: Reimbursement reconciliation tooling and reports.

- Rentals
  - Models and service are present.
  - Gaps: API routes, migrations, EUR formatting, URL-synced DataTable state, detail screen flows for start/return, and inventory reservation while active.

- Stock Location Details, Brands, User Preferences
  - Present with APIs; review minor UX and add tests.

- Miscellaneous placeholders
  - `src/modules/custom-orders/` only contains `models/` (no service/index). Either complete or remove for now.
  - `src/modules/supabase-fallback/services/` appears unused; remove or document purpose.

## Native Medusa Modules Integration

- Ensure consistent usage of native `/admin/customers`, `/admin/products`, `/admin/orders` endpoints in admin features.
- For product pricing in Admin modals, prefer Query API with pricing context (region/currency) when using native product/pricing modules; fallback is acceptable if Admin API lacks calculated prices.
- Inventory: confirm receiving purchase orders triggers inventory adjustments in native inventory module (you have `receive-purchase-order` step scaffolded—integrate with native inventory reservations/adjustments).

## Testing and Quality

- Tests
  - Add integration tests for each custom admin API: list/create/update/delete with filters and pagination.
  - Add a few UI smoke tests (Playwright) for service orders list/kanban, rentals list, invoices detail.

- Logging/Observability
  - Replace console logs with a structured logger, include request IDs, and scrub PII.

## Deployment Readiness

- Environment
  - Finalize CORS for store/admin/auth. Verify `FALLBACK_TO_SUPABASE` path and secrets.
  - Provide `.env.example` with all required vars.

- Migrations
  - Ensure all custom modules ship with up-to-date, reversible migrations (notably rentals missing).

- Jobs/Workers
  - If long-running CSV imports and PDF generation are used, run worker mode and document scaling.

## Step-by-Step Plan (Prioritized)

1) Rentals foundation (API + migrations + EUR formatting)
- Add admin routes, generate migrations, update Admin to use URL-synced pagination/search and EUR currency formatting.
- Acceptance: Rentals list loads from API, CRUD works, tables exist, values in EUR.

2) Service Orders API pagination + Kanban alignment
- Implement DB-level `listAndCount` in service + API; ensure Kanban consumes active-tab server-filtered data; remove debug logs.
- Acceptance: Large datasets paginate correctly; Kanban shows the same items as active list.

3) Pricing unit normalization
- Decide units (recommend major units throughout custom domains). Update models/comments/services/formatting accordingly; add helpers.
- Acceptance: Invoices and Service Orders display values correctly without ad-hoc divisions; tests cover totals.

4) Destructive actions + validations
- Implement delete for Service Orders; add DTO validation to write endpoints across modules.
- Acceptance: Delete works with confirmation and proper error handling; invalid inputs are rejected.

5) UX/i18n polish
- Remove debug logs, unify labels/badges, and ensure consistent language/currency/date formatting.
- Acceptance: Visual consistency across lists and details; Dutch/English translations present.

6) Testing & CI
- Add integration tests for APIs and basic UI smoke tests; set up CI to run tests and lint.
- Acceptance: Green CI; coverage includes critical flows.

## Notable Code References

- Service Orders Kanban status update route exists:
```1:38:src/api/admin/service-orders/[id]/status/route.ts
export async function PUT(req: MedusaRequest, res: MedusaResponse) { ... }
```

- Admin Kanban updates via the route above:
```247:263:src/admin/routes/service-orders/components/kanban-view.tsx
const updateStatusMutation = useMutation({
  mutationFn: async ({ orderId, newStatus }) => {
    const response = await fetch(`/admin/service-orders/${orderId}/status`, { method: "PUT", ... })
```

- Invoices service totals calculation (align units and formatting):
```114:129:src/modules/invoicing/service.ts
async recalculateInvoiceTotals(invoiceId: string) { ... }
```

---

Use this roadmap as a checklist to bring all modules to parity, stabilize API/DB behavior, polish Admin UX, and prepare the app for production deployment.


