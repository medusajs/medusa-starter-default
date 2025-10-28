# Invoice Merge Implementation Plan

## Overview
This document outlines the implementation plan for merging multiple invoices from the same customer into a single consolidated invoice. This feature will help reduce administrative overhead by combining small invoices into larger, more manageable ones.

---

## Parent Ticket: Invoice Merge Feature

**Description:**
Implement functionality to merge multiple invoices from the same customer into a single consolidated invoice. This feature should allow administrators to select multiple draft invoices and merge them into one invoice, combining all line items while maintaining proper audit trails.

**Success Criteria:**
- Administrators can select multiple invoices from the same customer
- Selected invoices can be merged into a single new invoice
- All line items from source invoices are transferred to the merged invoice
- Source invoices are cancelled with proper audit trail
- The merge operation is atomic (all or nothing)
- PDF generation works for merged invoices

---

## Child Tickets

### 1. Backend: Create Merge Invoice Workflow

**Priority:** High  
**Estimation:** 5 story points  

**Description:**
Create a new workflow `merge-invoices-workflow.ts` that orchestrates the invoice merging process following MedusaJS workflow patterns. This workflow will be the core business logic for merging invoices.

**Technical Details:**
- Create workflow file: `src/workflows/invoicing/merge-invoices-workflow.ts`
- Workflow should accept: `{ invoice_ids: string[], merged_by: string, notes?: string }`
- Workflow should return: `{ merged_invoice: Invoice, cancelled_invoices: Invoice[] }`

**Workflow Steps:**
1. Validate invoices can be merged
2. Create new merged invoice
3. Copy line items from source invoices
4. Recalculate invoice totals
5. Cancel source invoices
6. Create status history entries

**Acceptance Criteria:**
- Workflow follows MedusaJS workflow patterns (createWorkflow, WorkflowResponse)
- Workflow is atomic with proper compensation functions
- Workflow includes proper error handling
- Workflow validates all prerequisites before executing

**Dependencies:** None

---

### 2. Backend: Create Validate Invoices Mergeable Step

**Priority:** High  
**Estimation:** 3 story points  

**Description:**
Create a validation step that checks if the selected invoices can be merged together. This step ensures data integrity before attempting the merge operation.

**Technical Details:**
- Create step file: `src/workflows/invoicing/steps/validate-invoices-mergeable.ts`
- Use `createStep` function with proper compensation logic
- Return validated invoice data in StepResponse

**Validation Rules:**
- All invoices must exist
- All invoices must belong to the same customer
- All invoices must be in "draft" status
- All invoices must have the same currency
- Minimum of 2 invoices required
- Maximum of 10 invoices per merge (configurable)
- No invoices can have associated payments

**Acceptance Criteria:**
- Step validates all merge prerequisites
- Step throws descriptive MedusaError for violations
- Step returns validated invoice data
- Step includes unit tests for all validation scenarios

**Dependencies:** 
- Parent ticket #1 (part of the workflow)

---

### 3. Backend: Create Merged Invoice Step

**Priority:** High  
**Estimation:** 3 story points  

**Description:**
Create a step that creates a new invoice to hold the merged data from the source invoices.

**Technical Details:**
- Create step file: `src/workflows/invoicing/steps/create-merged-invoice.ts`
- Generate new invoice number using existing `generateInvoiceNumber()` method
- Copy customer and billing details from first source invoice

**Invoice Properties:**
- Use first invoice's customer details and addresses
- Set invoice_type based on line items (product_sale, service_work, or mixed)
- Set invoice_date to current date
- Set due_date based on payment terms or default 30 days
- Add metadata: `{ merged_from: invoice_ids[], merged_at: timestamp, merged_by: user_id }`
- Add notes indicating merge (append to any provided notes)

**Compensation Logic:**
- Delete created invoice if workflow fails

**Acceptance Criteria:**
- New invoice is created with proper metadata
- Invoice number is generated correctly
- Customer details are copied accurately
- Compensation function properly deletes invoice on failure
- Step includes unit tests

**Dependencies:**
- Parent ticket #1 (part of the workflow)

---

### 4. Backend: Copy Line Items to Merged Invoice Step

**Priority:** High  
**Estimation:** 4 story points  

**Description:**
Create a step that copies all line items from source invoices to the newly created merged invoice. This step should handle deduplication and aggregation where appropriate.

**Technical Details:**
- Create step file: `src/workflows/invoicing/steps/copy-line-items-to-merged-invoice.ts`
- Use `MathBN` for all financial calculations
- Preserve line item order by source invoice date

**Line Item Handling:**
- Copy all line items from source invoices
- Preserve all line item properties (type, references, prices, etc.)
- Maintain reference to original invoice in metadata: `{ source_invoice_id: string, source_invoice_number: string }`
- Optional: Group identical line items (same product/variant) and sum quantities
- Recalculate total_price and tax_amount for each line item

**Compensation Logic:**
- Delete all created line items if workflow fails

**Acceptance Criteria:**
- All line items are copied to merged invoice
- Financial calculations use MathBN correctly
- Line item metadata includes source invoice reference
- Line items maintain proper order
- Compensation deletes created line items
- Step includes unit tests with various scenarios

**Dependencies:**
- Parent ticket #1 (part of the workflow)
- Child ticket #3 (requires merged invoice to exist)

---

### 5. Backend: Cancel Source Invoices Step

**Priority:** High  
**Estimation:** 2 story points  

**Description:**
Create a step that cancels all source invoices after successful merge and creates proper status history entries for audit trail.

**Technical Details:**
- Create step file: `src/workflows/invoicing/steps/cancel-source-invoices.ts`
- Update invoice status to "cancelled"
- Create status history entries for audit

**Status Update:**
- Set status to `InvoiceStatus.CANCELLED`
- Add metadata: `{ cancelled_reason: "merged", merged_into_invoice_id: string, merged_into_invoice_number: string }`
- Create status history entry with reason: "Merged into invoice {invoice_number}"

**Compensation Logic:**
- Revert invoices back to "draft" status
- Delete status history entries created

**Acceptance Criteria:**
- Source invoices are marked as cancelled
- Status history entries are created
- Metadata properly references merged invoice
- Compensation reverts status changes
- Step includes unit tests

**Dependencies:**
- Parent ticket #1 (part of the workflow)
- Child ticket #4 (should only cancel after line items are copied)

---

### 6. Backend: Create Merge Invoices API Route

**Priority:** High  
**Estimation:** 3 story points  

**Description:**
Create an admin API route that exposes the invoice merge functionality to the frontend.

**Technical Details:**
- Create route file: `src/api/admin/invoices/merge/route.ts`
- Method: POST
- Path: `/admin/invoices/merge`
- Authentication: Require admin authentication

**Request Body:**
```typescript
{
  invoice_ids: string[],  // Array of invoice IDs to merge
  notes?: string,         // Optional notes for merged invoice
  payment_terms?: string  // Optional payment terms override
}
```

**Response:**
```typescript
{
  merged_invoice: Invoice,
  cancelled_invoices: Invoice[],
  message: string
}
```

**API Logic:**
1. Validate request body
2. Execute merge-invoices-workflow
3. Return merged invoice with details
4. Handle errors with appropriate HTTP status codes

**Error Responses:**
- 400: Invalid request (missing fields, validation errors)
- 404: One or more invoices not found
- 409: Invoices cannot be merged (different customers, statuses, etc.)
- 500: Server error

**Acceptance Criteria:**
- API route follows MedusaJS patterns
- Proper authentication and authorization
- Descriptive error messages
- Returns complete merged invoice data
- Integration test covering success and error scenarios

**Dependencies:**
- Child ticket #1 (requires workflow)

---

### 7. Backend: Add Merge-Related Queries to Invoice Service

**Priority:** Medium  
**Estimation:** 2 story points  

**Description:**
Extend the invoicing service with helper methods to support merge operations and queries.

**Technical Details:**
- Update file: `src/modules/invoicing/service.ts`

**New Methods:**
```typescript
// Get mergeable invoices for a customer
async getMergeableInvoicesForCustomer(
  customerId: string
): Promise<Invoice[]>

// Check if invoices can be merged
async canInvoicesBeMerged(
  invoiceIds: string[]
): Promise<{ mergeable: boolean, reason?: string }>

// Get invoices merged into a specific invoice
async getSourceInvoicesForMerged(
  mergedInvoiceId: string
): Promise<Invoice[]>

// Get merged invoice from a source invoice
async getMergedInvoiceFromSource(
  sourceInvoiceId: string
): Promise<Invoice | null>
```

**Acceptance Criteria:**
- Methods follow service patterns
- Proper error handling
- Methods are well-documented with JSDoc
- Unit tests for each method

**Dependencies:**
- Useful for frontend implementation but not blocking

---

### 8. Frontend: Add Bulk Selection to Invoice List

**Priority:** High  
**Estimation:** 3 story points  

**Description:**
Enhance the invoice list table to support selecting multiple invoices for bulk operations, specifically for merging.

**Technical Details:**
- Update file: `src/admin/routes/invoices/page.tsx`
- Use Medusa UI DataTable row selection features
- Add checkbox column for selection

**UI Changes:**
- Add checkbox column to DataTable
- Add "Select All" checkbox in header
- Show selection count when invoices are selected
- Add toolbar with bulk actions when items selected
- Highlight selected rows visually

**State Management:**
```typescript
const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([])
```

**Acceptance Criteria:**
- Users can select/deselect individual invoices
- Users can select/deselect all invoices
- Selection persists across page navigation
- Selected row count is displayed
- Visual feedback for selected rows

**Dependencies:**
- None (frontend foundation)

---

### 9. Frontend: Create Merge Invoices Button and Validation

**Priority:** High  
**Estimation:** 2 story points  

**Description:**
Add a "Merge Invoices" button to the invoice list toolbar that appears when multiple invoices are selected, with client-side validation.

**Technical Details:**
- Update file: `src/admin/routes/invoices/page.tsx`
- Add button to toolbar (only visible when 2+ invoices selected)
- Implement client-side validation before showing merge dialog

**Button Behavior:**
- Only show when 2 or more invoices are selected
- Disable with tooltip if selection is invalid
- Validate before opening merge dialog

**Client-Side Validation:**
- Check all selected invoices have same customer
- Check all selected invoices are in "draft" status
- Check all invoices have same currency
- Show descriptive error toast if validation fails

**Acceptance Criteria:**
- Button appears in toolbar when items selected
- Button shows validation errors in tooltip when disabled
- Toast notifications for validation errors
- Button styling follows Medusa UI patterns

**Dependencies:**
- Child ticket #8 (requires selection functionality)

---

### 10. Frontend: Create Merge Invoices Confirmation Modal

**Priority:** High  
**Estimation:** 4 story points  

**Description:**
Create a modal dialog that shows a preview of the merge operation and allows users to confirm or cancel the merge.

**Technical Details:**
- Create component: `src/admin/components/invoice-merge-modal.tsx`
- Use Medusa UI modal components
- Show preview of merge operation

**Modal Content:**
- Title: "Merge {count} Invoices"
- List of invoices being merged (invoice number, date, amount)
- Summary of merged invoice:
  - Total amount
  - Total line items
  - Currency
  - Customer details
- Optional fields:
  - Additional notes (textarea)
  - Payment terms override (input)
- Warning: "Source invoices will be cancelled. This action cannot be undone."
- Action buttons: "Cancel" and "Merge Invoices"

**Modal Props:**
```typescript
interface InvoiceMergeModalProps {
  invoices: Invoice[]
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { notes?: string, payment_terms?: string }) => void
}
```

**Acceptance Criteria:**
- Modal displays all relevant information
- Users can add notes and override payment terms
- Clear warning about action consequences
- Proper loading state during merge operation
- Success/error toast notifications
- Modal closes on success
- Follows Medusa UI design patterns

**Dependencies:**
- Child ticket #8 (requires selection)
- Child ticket #9 (triggered by button)

---

### 11. Frontend: Implement Merge API Integration

**Priority:** High  
**Estimation:** 3 story points  

**Description:**
Implement the frontend API integration to call the merge endpoint and handle responses.

**Technical Details:**
- Update file: `src/admin/routes/invoices/page.tsx`
- Use React Query for API calls and cache invalidation
- Implement proper error handling

**API Hook:**
```typescript
const useMergeInvoices = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      invoice_ids: string[]
      notes?: string
      payment_terms?: string
    }) => {
      const response = await fetch('/admin/invoices/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      toast.success('Invoices merged successfully')
    },
    onError: (error) => {
      toast.error('Failed to merge invoices')
    }
  })
}
```

**Error Handling:**
- Display specific error messages from API
- Handle network errors gracefully
- Show loading state during operation
- Disable actions during loading

**Acceptance Criteria:**
- API integration uses React Query patterns
- Proper cache invalidation after merge
- Loading states are shown
- Success/error notifications
- Error messages are user-friendly
- Invoice list refreshes after successful merge

**Dependencies:**
- Child ticket #6 (requires API route)
- Child ticket #10 (called from modal)

---

### 12. Frontend: Add Merged Invoice Indicator

**Priority:** Medium  
**Estimation:** 2 story points  

**Description:**
Add visual indicators in the invoice list and detail views to show when an invoice is merged or was created from a merge.

**Technical Details:**
- Update files:
  - `src/admin/routes/invoices/page.tsx`
  - `src/admin/components/invoice-view-modal.tsx`

**Invoice List Indicators:**
- Add badge for merged invoices: "Merged from {count} invoices"
- Add badge for cancelled (merged) invoices: "Merged into INV-XXXX"
- Show icon in status column for merged invoices

**Invoice Detail View:**
- Section showing "Merged Information" if applicable
- List of source invoices (with links) if merged invoice
- Link to merged invoice if source invoice
- Show merge timestamp and user who performed merge

**Acceptance Criteria:**
- Visual indicators are clear and informative
- Badges follow Medusa UI design
- Links navigate to referenced invoices
- Information is only shown when applicable

**Dependencies:**
- Child ticket #11 (merge functionality working)

---

### 13. Backend: Add Migration for Merged Invoice Metadata

**Priority:** High  
**Estimation:** 1 story point  

**Description:**
Create a database migration if needed to ensure the metadata field on invoices can properly store merge information. The existing metadata field should be sufficient, but this ticket ensures the schema is documented.

**Technical Details:**
- Review existing invoice model metadata field
- Document expected metadata schema for merged invoices
- Add migration only if schema changes needed

**Metadata Schema Documentation:**
```typescript
// For merged invoices
{
  merged_from: string[],      // Array of source invoice IDs
  merged_at: string,           // ISO timestamp
  merged_by: string            // User ID who performed merge
}

// For source (cancelled) invoices
{
  cancelled_reason: "merged",
  merged_into_invoice_id: string,
  merged_into_invoice_number: string
}
```

**Acceptance Criteria:**
- Metadata schema is documented
- Migration created if needed
- No breaking changes to existing invoices

**Dependencies:**
- Should be completed before workflow implementation

---

### 14. Backend: Add Unit Tests for Merge Workflow

**Priority:** High  
**Estimation:** 3 story points  

**Description:**
Create comprehensive unit tests for the merge workflow and all related steps.

**Technical Details:**
- Create test file: `src/workflows/invoicing/__tests__/merge-invoices-workflow.test.ts`
- Use MedusaJS testing patterns
- Mock dependencies

**Test Scenarios:**
- ✓ Successfully merge 2 invoices
- ✓ Successfully merge 5 invoices
- ✓ Fail when invoices have different customers
- ✓ Fail when invoices are not in draft status
- ✓ Fail when invoices have different currencies
- ✓ Fail with less than 2 invoices
- ✓ Compensation rolls back on error
- ✓ Line items are copied correctly
- ✓ Totals are calculated correctly
- ✓ Status history entries are created
- ✓ Metadata is set correctly

**Acceptance Criteria:**
- All test scenarios pass
- Code coverage > 90% for workflow and steps
- Tests follow MedusaJS testing patterns
- Tests are well-documented

**Dependencies:**
- Child tickets #1-5 (workflow and steps must be implemented)

---

### 15. Backend: Add Integration Tests for Merge API

**Priority:** Medium  
**Estimation:** 3 story points  

**Description:**
Create integration tests for the merge API endpoint to ensure end-to-end functionality.

**Technical Details:**
- Create test file: `src/api/admin/invoices/merge/__tests__/route.test.ts`
- Use MedusaJS integration testing patterns
- Test with real database

**Test Scenarios:**
- ✓ POST /admin/invoices/merge with valid data
- ✓ POST with missing required fields (400)
- ✓ POST with non-existent invoice IDs (404)
- ✓ POST with mixed customer invoices (409)
- ✓ POST with non-draft invoices (409)
- ✓ POST with single invoice (400)
- ✓ Verify merged invoice structure
- ✓ Verify source invoices are cancelled
- ✓ Verify line items are transferred
- ✓ Verify authentication is required

**Acceptance Criteria:**
- All test scenarios pass
- Tests use real database with fixtures
- Tests clean up after execution
- Tests verify response structure

**Dependencies:**
- Child ticket #6 (API route must be implemented)

---

### 16. Documentation: Add Merge Feature to Admin Guide

**Priority:** Low  
**Estimation:** 2 story points  

**Description:**
Create user documentation explaining how to use the invoice merge feature.

**Technical Details:**
- Create or update file: `docs/INVOICE_MANAGEMENT.md`
- Include screenshots (to be added after UI implementation)

**Documentation Sections:**
1. Overview of merge feature
2. When to use invoice merging
3. Step-by-step guide:
   - Selecting invoices to merge
   - Validating merge eligibility
   - Reviewing merge preview
   - Confirming merge
4. Understanding merged invoices
5. Finding source invoices
6. Limitations and restrictions
7. Troubleshooting common issues

**Acceptance Criteria:**
- Documentation is clear and comprehensive
- Includes practical examples
- Screenshots show actual UI (add later)
- Covers edge cases and limitations

**Dependencies:**
- Child tickets #8-12 (UI must be implemented)

---

### 17. Frontend: Add Translations for Merge Feature

**Priority:** Medium  
**Estimation:** 1 story point  

**Description:**
Add translation keys for all merge-related UI text in both English and Dutch.

**Technical Details:**
- Update files:
  - `src/admin/translations/en.json`
  - `src/admin/translations/nl.json`

**Translation Keys:**
```json
{
  "custom.invoices": {
    "merge": {
      "title": "Merge Invoices",
      "button": "Merge Selected",
      "confirmTitle": "Merge {count} Invoices?",
      "warning": "Source invoices will be cancelled. This cannot be undone.",
      "success": "Successfully merged {count} invoices",
      "error": "Failed to merge invoices",
      "validation": {
        "differentCustomers": "All invoices must belong to the same customer",
        "notDraft": "Only draft invoices can be merged",
        "differentCurrencies": "All invoices must have the same currency",
        "minimum": "Select at least 2 invoices to merge"
      },
      "labels": {
        "sourceInvoices": "Source Invoices",
        "mergedInvoice": "Merged Invoice",
        "additionalNotes": "Additional Notes",
        "paymentTerms": "Payment Terms"
      },
      "badges": {
        "mergedFrom": "Merged from {count} invoices",
        "mergedInto": "Merged into {invoiceNumber}"
      }
    }
  }
}
```

**Acceptance Criteria:**
- All UI text uses translation keys
- English translations are complete
- Dutch translations are complete and accurate
- Translation keys follow existing patterns

**Dependencies:**
- Should be done alongside frontend implementation

---

### 18. Testing: Manual QA Testing Plan

**Priority:** Medium  
**Estimation:** 2 story points  

**Description:**
Create and execute a comprehensive manual QA testing plan for the invoice merge feature.

**Testing Checklist:**

**Happy Path:**
- [ ] Merge 2 draft invoices from same customer
- [ ] Merge 5 draft invoices from same customer
- [ ] Verify merged invoice has all line items
- [ ] Verify merged invoice totals are correct
- [ ] Verify source invoices are cancelled
- [ ] Generate PDF for merged invoice
- [ ] Verify merged invoice appears in customer history

**Validation:**
- [ ] Attempt to merge invoices from different customers (should fail)
- [ ] Attempt to merge non-draft invoices (should fail)
- [ ] Attempt to merge invoices with different currencies (should fail)
- [ ] Attempt to merge single invoice (should fail)
- [ ] Attempt to merge with invalid invoice IDs (should fail)

**UI/UX:**
- [ ] Selection UI works correctly
- [ ] Merge button appears/disappears correctly
- [ ] Modal displays correct information
- [ ] Loading states are shown
- [ ] Success/error messages are clear
- [ ] Indicators show merged status correctly
- [ ] Links to source/merged invoices work

**Edge Cases:**
- [ ] Merge invoices with many line items (>50)
- [ ] Merge invoices with various line item types
- [ ] Merge invoices with discounts and taxes
- [ ] Merge after page refresh
- [ ] Multiple users merging simultaneously

**Acceptance Criteria:**
- All test scenarios documented
- All tests pass
- Bugs are documented and fixed
- Sign-off from product owner

**Dependencies:**
- All implementation tickets complete

---

## Implementation Order

The recommended implementation order is:

**Phase 1: Core Backend (Week 1)**
1. Ticket #13: Migration/Schema documentation
2. Ticket #2: Validate invoices mergeable step
3. Ticket #3: Create merged invoice step
4. Ticket #4: Copy line items step
5. Ticket #5: Cancel source invoices step
6. Ticket #1: Merge invoices workflow
7. Ticket #14: Unit tests for workflow

**Phase 2: API Layer (Week 1-2)**
8. Ticket #6: Merge invoices API route
9. Ticket #7: Service helper methods
10. Ticket #15: Integration tests for API

**Phase 3: Frontend (Week 2)**
11. Ticket #17: Translations
12. Ticket #8: Bulk selection UI
13. Ticket #9: Merge button and validation
14. Ticket #10: Merge confirmation modal
15. Ticket #11: API integration
16. Ticket #12: Merged invoice indicators

**Phase 4: Testing & Documentation (Week 3)**
17. Ticket #18: Manual QA testing
18. Ticket #16: Documentation

---

## Technical Considerations

### MedusaJS Best Practices Applied

1. **Workflows**: Use `createWorkflow` and `createStep` for atomic operations with compensation
2. **Data Models**: Leverage existing invoice model with metadata for extensibility
3. **BigNumber Arithmetic**: Use `MathBN` for all financial calculations
4. **Remote Query**: Use Query for fetching related data with proper field selection
5. **Error Handling**: Use `MedusaError` with appropriate error types
6. **Authentication**: Require admin authentication for merge operations
7. **Audit Trail**: Maintain status history for all invoice state changes
8. **Module Resolution**: Use `INVOICING_MODULE` constant for service resolution

### Database Considerations

- No schema changes required (using existing metadata JSON field)
- Ensure indexes on `customer_id` and `status` for efficient queries
- Consider adding composite index on `(customer_id, status, currency_code)` for merge queries

### Performance Considerations

- Limit maximum invoices per merge to 10 (configurable)
- Use database transactions (handled by workflow)
- Batch line item creation where possible
- Consider pagination for large line item lists in UI

### Security Considerations

- Require admin authentication for all merge operations
- Validate user has permission to modify invoices
- Log all merge operations for audit
- Prevent merging invoices with payments

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during merge | High | Low | Comprehensive workflow testing, compensation functions |
| PDF generation fails for merged invoices | Medium | Low | Reuse existing PDF generation, test with many line items |
| Performance issues with many line items | Medium | Medium | Limit invoices per merge, optimize queries |
| Concurrent merge operations | Medium | Low | Use database transactions, test concurrency |
| Customer confusion about cancelled invoices | Low | Medium | Clear UI indicators, good documentation |

---

## Success Metrics

- Merge operation completes in < 5 seconds for 5 invoices
- Zero data loss in production
- 90%+ code coverage for new code
- Positive user feedback on UI/UX
- Reduction in total invoice count by target percentage

---

## Future Enhancements (Out of Scope)

- Automatic invoice merging based on rules (e.g., merge all invoices from same customer older than X days)
- Undo merge operation
- Split merged invoice back into originals
- Merge invoices across different currencies with conversion
- Batch merge operations (merge multiple sets at once)
- Email notification to customer about merged invoice

