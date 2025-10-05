# Invoicing Module Implementation Plan

This document outlines the implementation plan for completing the invoicing module to support Belgian legal requirements and the complete invoice workflow: automatic creation → editing → sending → locking.

## Overview

Invoices should be automatically created when:
- **Orders**: When an order is fulfilled/shipped (already implemented via `order.fulfillment_created` event)
- **Service Orders**: When service order status changes to "done" (needs implementation)

Workflow:
1. **Draft** - Invoice created automatically, fully editable
2. **Sent** - After sending to customer via email with PDF, invoice becomes read-only
3. **Paid** - When payment received, invoice marked as paid

---

## Phase 1: Core Backend - Automation & Validation

### Task 1.1: Service Order "Done" Status Subscriber

**File**: `/src/subscribers/service-order-done-invoice.ts`

**Requirements**:
- Create new subscriber listening to service order status changes
- Filter for status === 'done'
- Execute `createInvoiceFromServiceOrderWorkflow`
- Handle errors gracefully with console logging

**Implementation**:
```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { createInvoiceFromServiceOrderWorkflow } from "../workflows/invoicing/create-invoice-from-service-order"

export default async function serviceOrderDoneInvoiceHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; status: string }>) {
  // Only trigger when status changes to 'done'
  if (data.status !== 'done') {
    return
  }

  const serviceOrderId = data.id

  if (!serviceOrderId) {
    console.log('No service_order_id found in event data')
    return
  }

  try {
    const { result } = await createInvoiceFromServiceOrderWorkflow(container).run({
      input: {
        service_order_id: serviceOrderId,
        invoice_type: "service_work",
        payment_terms: "30 dagen",
        notes: "Automatisch gegenereerde factuur bij voltooiing serviceorder",
        created_by: "system"
      }
    })

    console.log(`Invoice created for service order ${serviceOrderId}:`, result.invoice_number)
  } catch (error) {
    console.error(`Failed to create invoice for service order ${serviceOrderId}:`, error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "service_order.updated",
  context: {
    subscriberId: "service-order-done-invoice-handler",
  },
}
```

**Dependencies**: None
**Testing**: Update service order status to "done", verify invoice is created automatically

---

### Task 1.2: Invoice Edit Restrictions - Workflow

**File**: `/src/workflows/invoicing/update-invoice-workflow.ts` (new file)

**Requirements**:
- Create workflow to handle invoice updates
- Validate invoice status before allowing edits
- Use workflow steps for validation and updates
- API route should call this workflow

**Implementation**:
```typescript
import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoiceEditableStep } from "./steps/validate-invoice-editable"
import { updateInvoiceStep } from "./steps/update-invoice"

export interface UpdateInvoiceInput {
  invoice_id: string
  data: {
    customer_email?: string
    customer_phone?: string
    payment_terms?: string
    notes?: string
    internal_notes?: string
    discount_amount?: number
  }
}

export const updateInvoiceWorkflowId = "update-invoice"

export const updateInvoiceWorkflow = createWorkflow(
  updateInvoiceWorkflowId,
  (input: UpdateInvoiceInput) => {
    // Validate invoice can be edited
    validateInvoiceEditableStep(input.invoice_id)

    // Update invoice
    const invoice = updateInvoiceStep({
      invoice_id: input.invoice_id,
      data: input.data,
    })

    return new WorkflowResponse(invoice)
  }
)
```

**File**: `/src/workflows/invoicing/steps/validate-invoice-editable.ts` (new file)

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const validateInvoiceEditableStep = createStep(
  "validate-invoice-editable",
  async (invoice_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const invoice = await invoicingService.retrieveInvoice(invoice_id)

    if (!invoice) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Invoice with id ${invoice_id} not found`
      )
    }

    if (invoice.status !== 'draft') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot edit invoice with status "${invoice.status}". Only draft invoices can be edited.`
      )
    }

    return new StepResponse({ invoice })
  }
)
```

**File**: `/src/workflows/invoicing/steps/update-invoice.ts` (new file)

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

interface UpdateInvoiceInput {
  invoice_id: string
  data: Record<string, any>
}

export const updateInvoiceStep = createStep(
  "update-invoice",
  async (input: UpdateInvoiceInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const oldInvoice = await invoicingService.retrieveInvoice(input.invoice_id)

    const invoice = await invoicingService.updateInvoices(
      input.data,
      { id: input.invoice_id }
    )

    return new StepResponse(invoice, {
      invoice_id: input.invoice_id,
      old_data: oldInvoice,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.updateInvoices(
      compensationData.old_data,
      { id: compensationData.invoice_id }
    )
  }
)
```

**File**: `/src/api/admin/invoices/[id]/route.ts` (update PATCH endpoint)

```typescript
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateInvoiceWorkflow } from "../../../../workflows/invoicing/update-invoice-workflow"
import { changeInvoiceStatusWorkflow } from "../../../../workflows/invoicing/change-invoice-status-workflow"

interface UpdateInvoiceRequest {
  status?: string
  status_reason?: string
  customer_email?: string
  customer_phone?: string
  payment_terms?: string
  notes?: string
  internal_notes?: string
  discount_amount?: number
}

export const PATCH = async (
  req: AuthenticatedMedusaRequest<UpdateInvoiceRequest>,
  res: MedusaResponse
) => {
  const invoiceId = req.params.id
  const { status, status_reason, ...updateData } = req.validatedBody

  try {
    // Handle status changes separately via workflow
    if (status) {
      const { result } = await changeInvoiceStatusWorkflow(req.scope).run({
        input: {
          invoice_id: invoiceId,
          new_status: status,
          changed_by: req.auth_context?.actor_id || "system",
          reason: status_reason,
        }
      })

      return res.json({ invoice: result })
    }

    // Handle field updates via workflow
    const { result } = await updateInvoiceWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        data: updateData,
      }
    })

    res.json({ invoice: result })
  } catch (error: any) {
    res.status(error.type === "not_found" ? 404 : 400).json({
      error: error.message,
    })
  }
}
```

**Dependencies**: None
**Testing**: Try to edit invoice with status "sent" or "paid", should return 400 error

---

### Task 1.3: Status Transition Workflow

**File**: `/src/workflows/invoicing/change-invoice-status-workflow.ts` (new file)

**Requirements**:
- Create workflow to handle status changes
- Validate state transitions
- Update invoice status and create history entry
- Prevent invalid transitions (e.g., paid → draft, sent → draft)

**Valid Transitions**:
```
draft → sent
draft → cancelled
sent → paid
sent → cancelled
paid → (no transitions allowed)
cancelled → (no transitions allowed)
```

**Implementation**:
```typescript
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateStatusTransitionStep } from "./steps/validate-status-transition"
import { changeInvoiceStatusStep } from "./steps/change-invoice-status"

export interface ChangeInvoiceStatusInput {
  invoice_id: string
  new_status: string
  changed_by: string
  reason?: string
}

export const changeInvoiceStatusWorkflowId = "change-invoice-status"

export const changeInvoiceStatusWorkflow = createWorkflow(
  changeInvoiceStatusWorkflowId,
  (input: ChangeInvoiceStatusInput) => {
    // Validate transition is allowed
    validateStatusTransitionStep({
      invoice_id: input.invoice_id,
      new_status: input.new_status,
    })

    // Update status
    const invoice = changeInvoiceStatusStep(input)

    return new WorkflowResponse(invoice)
  }
)
```

**File**: `/src/workflows/invoicing/steps/validate-status-transition.ts` (new file)

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

interface ValidateStatusTransitionInput {
  invoice_id: string
  new_status: string
}

export const validateStatusTransitionStep = createStep(
  "validate-status-transition",
  async (input: ValidateStatusTransitionInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const invoice = await invoicingService.retrieveInvoice(input.invoice_id)

    const validTransitions: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['paid', 'cancelled'],
      paid: [],
      overdue: ['paid', 'cancelled'],
      cancelled: []
    }

    const allowedTransitions = validTransitions[invoice.status] || []

    if (!allowedTransitions.includes(input.new_status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid status transition from "${invoice.status}" to "${input.new_status}". ` +
        `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      )
    }

    return new StepResponse({ invoice })
  }
)
```

**File**: `/src/workflows/invoicing/steps/change-invoice-status.ts` (see Task 3.4 for full implementation)

**Dependencies**: None
**Testing**: Try invalid transitions via API, should return error

---

## Phase 2: Line Item Management Workflows

### Task 2.1: Add Line Item Workflow & API

**File**: `/src/workflows/invoicing/add-line-item-workflow.ts` (new file)

**Requirements**:
- Create workflow to add line item to invoice
- Validate invoice is in draft status
- Auto-recalculate invoice totals after adding

**Implementation**:
```typescript
import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoiceEditableStep } from "./steps/validate-invoice-editable"
import { addLineItemStep } from "./steps/add-line-item"
import { recalculateInvoiceTotalsStep } from "./steps/recalculate-invoice-totals"

export interface AddLineItemInput {
  invoice_id: string
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_rate?: number
  hours_worked?: number
  hourly_rate?: number
  notes?: string
}

export const addLineItemWorkflowId = "add-line-item-to-invoice"

export const addLineItemWorkflow = createWorkflow(
  addLineItemWorkflowId,
  (input: AddLineItemInput) => {
    // Validate invoice can be edited
    validateInvoiceEditableStep(input.invoice_id)

    // Add line item
    const lineItem = addLineItemStep(input)

    // Recalculate totals
    recalculateInvoiceTotalsStep(input.invoice_id)

    return new WorkflowResponse(lineItem)
  }
)
```

**File**: `/src/workflows/invoicing/steps/add-line-item.ts` (new file)

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const addLineItemStep = createStep(
  "add-line-item",
  async (input: any, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const lineItem = await invoicingService.createInvoiceLineItems({
      invoice_id: input.invoice_id,
      item_type: input.item_type || 'product',
      product_id: input.product_id,
      variant_id: input.variant_id,
      title: input.title,
      description: input.description,
      sku: input.sku,
      quantity: input.quantity,
      unit_price: input.unit_price,
      discount_amount: input.discount_amount || 0,
      tax_rate: input.tax_rate || 0.21,
      hours_worked: input.hours_worked,
      hourly_rate: input.hourly_rate,
      notes: input.notes,
      // Calculate totals
      total_price: input.quantity * input.unit_price - (input.discount_amount || 0),
      tax_amount: (input.quantity * input.unit_price - (input.discount_amount || 0)) * (input.tax_rate || 0.21),
    })

    return new StepResponse(lineItem, {
      line_item_id: lineItem.id,
      invoice_id: input.invoice_id,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.deleteInvoiceLineItems([compensationData.line_item_id])
  }
)
```

**File**: `/src/workflows/invoicing/steps/recalculate-invoice-totals.ts` (new file)

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const recalculateInvoiceTotalsStep = createStep(
  "recalculate-invoice-totals",
  async (invoice_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const lineItems = await invoicingService.listInvoiceLineItems({
      invoice_id,
    })

    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = lineItems.reduce((sum, item) => sum + item.tax_amount, 0)
    const invoice = await invoicingService.retrieveInvoice(invoice_id)

    const totalAmount = subtotal + taxAmount - (invoice.discount_amount || 0)

    const updatedInvoice = await invoicingService.updateInvoices(
      {
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      },
      { id: invoice_id }
    )

    return new StepResponse(updatedInvoice)
  }
)
```

**File**: `/src/api/admin/invoices/[id]/line-items/route.ts` (new file)

```typescript
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addLineItemWorkflow } from "../../../../../workflows/invoicing/add-line-item-workflow"

interface CreateLineItemRequest {
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_rate?: number
  hours_worked?: number
  hourly_rate?: number
  notes?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateLineItemRequest>,
  res: MedusaResponse
) => {
  const invoiceId = req.params.id

  try {
    const { result } = await addLineItemWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        ...req.validatedBody,
      }
    })

    res.status(201).json({ line_item: result })
  } catch (error: any) {
    res.status(error.type === "not_found" ? 404 : 400).json({
      error: error.message,
    })
  }
}
```

**Dependencies**: Task 1.2 (validateInvoiceEditableStep)
**Testing**: Add line item via API, verify totals recalculate

---

**File**: `/src/api/admin/invoices/[id]/line-items/[itemId]/route.ts` (new file)

**Requirements**:
- PATCH/DELETE endpoints call workflows (similar pattern to Task 2.1)
- Create `updateLineItemWorkflow` and `deleteLineItemWorkflow`
- Both validate draft status and recalculate totals

**Implementation**: Similar to Task 2.1, create workflows for update/delete operations that:
1. Validate invoice is editable
2. Update/delete line item
3. Recalculate totals
4. Return result via MedusaJS v2 API route pattern

**Dependencies**: Task 2.1 pattern
**Testing**: Update/delete line items, verify totals recalculate

---

### Task 2.2: Remove Service Helper Methods

**File**: `/src/modules/invoicing/service.ts`

**Requirements**:
- **REMOVE** business logic methods like `applyInvoiceDiscount` and `recalculateInvoiceTotals`
- These should be **workflow steps** (already created in Task 2.1)
- Keep service focused on CRUD operations only

**Changes**:
- Move `recalculateInvoiceTotals` logic to `recalculateInvoiceTotalsStep` (done in Task 2.1)
- Move `applyInvoiceDiscount` to a workflow step if needed
- Service should only have: `create*`, `update*`, `delete*`, `list*`, `retrieve*` methods

**Dependencies**: Task 2.1
**Testing**: Verify workflows work without service helper methods

---

## Phase 3: Send Invoice Workflow

### Task 3.1: Send Invoice Workflow

**File**: `/src/workflows/invoicing/send-invoice-workflow.ts` (new file)

**Requirements**:
- Validate invoice is in draft status
- Generate PDF if not exists
- Send email with PDF attachment
- Change status to 'sent' (locks editing)
- Record sent_date

**Implementation**:
```typescript
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { generateInvoicePdfStep } from "./steps/generate-invoice-pdf"
import { sendInvoiceEmailStep } from "./steps/send-invoice-email"
import { validateInvoiceStep } from "./steps/validate-invoice"
import { changeInvoiceStatusStep } from "./steps/change-invoice-status"

export interface SendInvoiceInput {
  invoice_id: string
  recipient_email?: string
  cc_emails?: string[]
  custom_message?: string
  language?: 'nl' | 'fr' | 'en'
}

export const sendInvoiceWorkflow = createWorkflow(
  "send-invoice",
  (input: SendInvoiceInput) => {
    // Step 1: Validate invoice can be sent
    const validation = validateInvoiceStep(input)

    // Step 2: Generate PDF if not exists
    const pdf = generateInvoicePdfStep({
      invoice_id: input.invoice_id
    })

    // Step 3: Send email with PDF
    const emailResult = sendInvoiceEmailStep({
      invoice_id: input.invoice_id,
      recipient_email: input.recipient_email,
      cc_emails: input.cc_emails,
      custom_message: input.custom_message,
      language: input.language || 'nl',
      pdf_url: pdf.file.url
    })

    // Step 4: Change status to 'sent'
    const invoice = changeInvoiceStatusStep({
      invoice_id: input.invoice_id,
      new_status: 'sent',
      changed_by: 'system',
      reason: `Invoice sent to ${emailResult.sent_to}`
    })

    return new WorkflowResponse({
      invoice,
      email_sent_to: emailResult.sent_to,
      pdf_url: pdf.file.url
    })
  }
)
```

**Dependencies**: Tasks 3.2, 3.3, 3.4
**Testing**: Execute workflow, verify email sent and status changed

---

### Task 3.2: Validate Invoice Step

**File**: `/src/workflows/invoicing/steps/validate-invoice.ts` (new file)

**Requirements**:
- Check invoice exists
- Verify status is 'draft'
- Ensure has line items
- Verify customer email exists

**Implementation**:
```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const validateInvoiceStep = createStep(
  "validate-invoice",
  async (input: { invoice_id: string }, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const invoice = await invoicingService.retrieveInvoice(input.invoice_id)

    if (!invoice) {
      throw new Error(`Invoice ${input.invoice_id} not found`)
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Invoice must be in draft status to send. Current status: ${invoice.status}`)
    }

    const lineItems = await invoicingService.listInvoiceLineItems({
      invoice_id: input.invoice_id
    })

    if (!lineItems || lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item')
    }

    if (!invoice.customer_email) {
      throw new Error('Invoice must have a customer email')
    }

    return new StepResponse({ valid: true, invoice })
  }
)
```

**Dependencies**: None
**Testing**: Call with invalid invoices, verify errors

---

### Task 3.3: Send Invoice Email Step

**File**: `/src/workflows/invoicing/steps/send-invoice-email.ts` (new file)

**Requirements**:
- Use MedusaJS notification service
- Send email with PDF attachment
- Support Dutch/French/English templates
- Include invoice summary in email body

**Implementation**:
```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type SendInvoiceEmailInput = {
  invoice_id: string
  recipient_email?: string
  cc_emails?: string[]
  custom_message?: string
  language: 'nl' | 'fr' | 'en'
  pdf_url: string
}

export const sendInvoiceEmailStep = createStep(
  "send-invoice-email",
  async (input: SendInvoiceEmailInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    const invoice = await invoicingService.retrieveInvoice(input.invoice_id)

    const recipientEmail = input.recipient_email || invoice.customer_email

    // Email templates by language
    const templates = {
      nl: {
        subject: `Factuur ${invoice.invoice_number}`,
        body: `Beste,

Hierbij ontvangt u factuur ${invoice.invoice_number} voor een totaalbedrag van €${invoice.total_amount}.

${input.custom_message || ''}

Betaaltermijn: ${invoice.payment_terms || '30 dagen'}
Vervaldatum: ${new Date(invoice.due_date).toLocaleDateString('nl-BE')}

Met vriendelijke groet`
      },
      fr: {
        subject: `Facture ${invoice.invoice_number}`,
        body: `Cher client,

Veuillez trouver ci-joint la facture ${invoice.invoice_number} d'un montant total de €${invoice.total_amount}.

${input.custom_message || ''}

Conditions de paiement: ${invoice.payment_terms || '30 jours'}
Date d'échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-BE')}

Cordialement`
      },
      en: {
        subject: `Invoice ${invoice.invoice_number}`,
        body: `Dear customer,

Please find attached invoice ${invoice.invoice_number} for a total amount of €${invoice.total_amount}.

${input.custom_message || ''}

Payment terms: ${invoice.payment_terms || '30 days'}
Due date: ${new Date(invoice.due_date).toLocaleDateString('en-BE')}

Best regards`
      }
    }

    const template = templates[input.language]

    try {
      // Using MedusaJS notification module
      await notificationService.createNotifications({
        to: recipientEmail,
        channel: "email",
        template: "invoice-email",
        data: {
          subject: template.subject,
          body: template.body,
          invoice_number: invoice.invoice_number,
          pdf_url: input.pdf_url,
          cc: input.cc_emails,
        },
      })

      return new StepResponse({
        sent_to: recipientEmail,
        sent_at: new Date()
      })
    } catch (error: any) {
      console.error("Failed to send invoice email:", error)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send invoice email: ${error.message}`
      )
    }
  }
)
```

**Dependencies**: None (uses MedusaJS notification module)
**Testing**: Send test email, verify receipt with PDF

---

### Task 3.4: Change Invoice Status Step

**File**: `/src/workflows/invoicing/steps/change-invoice-status.ts` (new file)

**Requirements**:
- Reusable step to change invoice status
- Uses existing service method

**Implementation**:
```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type ChangeInvoiceStatusInput = {
  invoice_id: string
  new_status: string
  changed_by: string
  reason?: string
}

export const changeInvoiceStatusStep = createStep(
  "change-invoice-status",
  async (input: ChangeInvoiceStatusInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const oldInvoice = await invoicingService.retrieveInvoice(input.invoice_id)
    const oldStatus = oldInvoice.status

    const invoice = await invoicingService.changeInvoiceStatus(
      input.invoice_id,
      input.new_status,
      input.changed_by,
      input.reason
    )

    return new StepResponse(invoice, {
      invoice_id: input.invoice_id,
      old_status: oldStatus
    })
  },
  async (compensationData, { container }) => {
    // Compensation: revert status change
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)

    await invoicingService.changeInvoiceStatus(
      compensationData.invoice_id,
      compensationData.old_status,
      'system',
      'Workflow compensation - reverting status'
    )
  }
)
```

**Dependencies**: None
**Testing**: Change status via workflow, verify history recorded

---

### Task 3.5: Send Invoice API Endpoint

**File**: `/src/api/admin/invoices/[id]/send/route.ts` (new file)

**Requirements**:
- POST endpoint to trigger send workflow
- Accept optional recipient, CC, message
- Return success with sent details

**Implementation**:
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendInvoiceWorkflow } from "../../../../../workflows/invoicing/send-invoice-workflow"

interface SendInvoiceRequest {
  recipient_email?: string
  cc_emails?: string[]
  custom_message?: string
  language?: 'nl' | 'fr' | 'en'
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoiceId = req.params.id
    const {
      recipient_email,
      cc_emails,
      custom_message,
      language = 'nl'
    } = req.body as SendInvoiceRequest

    const { result } = await sendInvoiceWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        recipient_email,
        cc_emails,
        custom_message,
        language
      }
    })

    res.json({
      success: true,
      sent_to: result.email_sent_to,
      invoice: {
        id: result.invoice.id,
        invoice_number: result.invoice.invoice_number,
        status: result.invoice.status,
        sent_date: result.invoice.sent_date
      },
      pdf_url: result.pdf_url
    })
  } catch (error) {
    console.error("Error sending invoice:", error)
    res.status(500).json({
      error: "Failed to send invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
```

**Dependencies**: Task 3.1
**Testing**: Send invoice via API, verify workflow executes

---

## Phase 4: Belgian Legal Compliance

### Task 4.1: Add Belgian Invoice Fields

**File**: `/src/modules/invoicing/models/invoice.ts`

**Requirements**:
- Add company VAT number field
- Add company registration number
- Add payment reference (structured communication)
- Create migration for new fields

**Implementation** (add to model around line 65):
```typescript
// Belgian Legal Requirements
company_vat_number: model.text().default("BE0123456789"), // TODO: Get from config
company_registration_number: model.text().nullable(),
payment_reference: model.text().nullable(), // Structured communication for Belgian banks
bank_account: model.text().nullable(), // IBAN

// Company details (for PDF)
company_name: model.text().default("Your Company Name"), // TODO: Get from config
company_address: model.json().nullable(),
```

**Migration**: Run `npx medusa db:generate invoicing` after model changes

**Dependencies**: None
**Testing**: Create invoice, verify new fields stored

---

### Task 4.2: Generate Payment Reference

**File**: `/src/modules/invoicing/service.ts`

**Requirements**:
- Generate Belgian structured communication (+++000/0000/00000+++)
- Add to `createInvoiceWithNumber()` method

**Implementation** (add method):
```typescript
async generatePaymentReference(invoiceNumber: string): Promise<string> {
  // Belgian structured communication format: +++000/0000/00000+++
  // Based on invoice number, generate a check digit using modulo 97

  // Remove non-numeric characters from invoice number
  const numericPart = invoiceNumber.replace(/\D/g, '').padStart(10, '0').slice(-10)

  // Calculate check digit (modulo 97, or 97 if result is 0)
  const checkDigit = (parseInt(numericPart) % 97) || 97

  // Format: +++XXX/XXXX/XXXCC+++
  const formatted = `+++${numericPart.slice(0, 3)}/${numericPart.slice(3, 7)}/${numericPart.slice(7, 10)}${String(checkDigit).padStart(2, '0')}+++`

  return formatted
}
```

Update `createInvoiceWithNumber()` (around line 64):
```typescript
async createInvoiceWithNumber(data: CreateInvoiceInput) {
  const invoiceNumber = await this.generateInvoiceNumber()
  const paymentReference = await this.generatePaymentReference(invoiceNumber)

  // ... existing logic

  const invoice = await this.createInvoices({
    ...data,
    invoice_number: invoiceNumber,
    payment_reference: paymentReference,
    // ... rest of fields
  })

  // ... existing logic
}
```

**Dependencies**: Task 4.1
**Testing**: Create invoice, verify payment reference generated correctly

---

### Task 4.3: Update PDF Generation for Belgian Compliance

**File**: `/src/workflows/invoicing/steps/generate-invoice-pdf.ts`

**Requirements**:
- Ensure PDF includes all Belgian legal fields
- Company VAT number prominently displayed
- Payment reference included
- Correct VAT breakdown
- Bank account details

**Note**: Current implementation uses Medusa Documents plugin. If plugin doesn't support Belgian requirements, consider implementing custom PDF generation using `pdfkit` or `puppeteer`.

**Implementation** (update existing step to pass more data):
```typescript
// Around line 48, before generating PDF
const documentInvoice = await documentsService.generateDocumentInvoice(
  invoiceData.order_id,
  {
    // Pass additional Belgian fields to template
    company_vat_number: invoiceData.company_vat_number,
    payment_reference: invoiceData.payment_reference,
    bank_account: invoiceData.bank_account,
    // ... other Belgian fields
  }
)
```

**Alternative**: If Medusa Documents doesn't support this, create new custom PDF generation:
- **File**: `/src/workflows/invoicing/steps/generate-custom-invoice-pdf.ts`
- Use HTML template + puppeteer or pdfkit
- Template should include all Belgian legal requirements

**Dependencies**: Task 4.1, Task 4.2
**Testing**: Generate PDF, verify all legal fields present

---

## Phase 5: Frontend - Invoice Detail Screen (PRIORITY)

### Task 5.1: Invoice Detail Page Layout

**File**: `/src/admin/routes/invoices/[id]/page.tsx` (new file)

**Requirements**:
- Two-column layout using TwoColumnPage component
- Main column: Line items, Totals
- Sidebar: Overview, Actions, Source link
- Fetch invoice with all relationships

**Implementation**:
```typescript
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import InvoiceLineItemsWidget from "../../../components/widgets/invoice-line-items-widget"
import InvoiceTotalsWidget from "../../../components/widgets/invoice-totals-widget"
import InvoiceOverviewWidget from "../../../components/widgets/invoice-overview-widget"
import InvoiceActionsWidget from "../../../components/widgets/invoice-actions-widget"
import InvoiceSourceLinkWidget from "../../../components/widgets/invoice-source-link-widget"

const InvoiceDetails = () => {
  const { id } = useParams()

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const response = await fetch(`/admin/invoices/${id}`)
      if (!response.ok) throw new Error("Failed to fetch invoice")
      return response.json()
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !invoice) {
    return <SingleColumnPageSkeleton sections={3} />
  }

  if (error) {
    throw error
  }

  const inv = invoice.invoice

  return (
    <TwoColumnPage
      widgets={{
        before: [],
        after: [],
        sideAfter: [],
        sideBefore: [],
      }}
      data={inv}
      hasOutlet={false}
      showJSON={false}
      showMetadata={false}
    >
      <TwoColumnPage.Main>
        <InvoiceLineItemsWidget data={inv} />
        <InvoiceTotalsWidget data={inv} />
      </TwoColumnPage.Main>

      <TwoColumnPage.Sidebar>
        <InvoiceOverviewWidget data={inv} />
        <InvoiceActionsWidget data={inv} />
        <InvoiceSourceLinkWidget data={inv} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export default InvoiceDetails

export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/invoices/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch invoice")
    const data = await response.json()
    return data.invoice
  } catch (error) {
    console.error("Error loading invoice:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Invoice Details",
})

export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.invoice_number) {
      return data.invoice_number
    }
    return "Invoice Details"
  },
}
```

**Dependencies**: Tasks 5.2, 5.3, 5.4, 5.5, 5.6
**Testing**: Navigate to invoice detail page, verify layout

---

### Task 5.2: Invoice Overview Widget

**File**: `/src/admin/components/widgets/invoice-overview-widget.tsx` (new file)

**Requirements**:
- Display invoice header info
- Invoice number, date, due date
- Customer details
- Status badge
- Payment terms
- Read-only display

**Implementation**:
```typescript
import { Container, Heading, Text, Label, StatusBadge } from "@medusajs/ui"

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: string
  customer_email: string
  customer_phone?: string
  payment_terms?: string
  currency_code: string
  customer?: {
    first_name?: string
    last_name?: string
    company_name?: string
  }
}

interface InvoiceOverviewWidgetProps {
  data: Invoice
}

const InvoiceOverviewWidget = ({ data: invoice }: InvoiceOverviewWidgetProps) => {
  const statusVariants = {
    draft: "orange",
    sent: "blue",
    paid: "green",
    overdue: "red",
    cancelled: "grey",
  } as const

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading level="h2">{invoice.invoice_number}</Heading>
          <StatusBadge color={statusVariants[invoice.status as keyof typeof statusVariants]}>
            {invoice.status}
          </StatusBadge>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div>
          <Label size="small" weight="plus" className="mb-2 block">
            Invoice Date
          </Label>
          <Text size="small">
            {new Date(invoice.invoice_date).toLocaleDateString('nl-BE')}
          </Text>
        </div>

        <div>
          <Label size="small" weight="plus" className="mb-2 block">
            Due Date
          </Label>
          <Text size="small">
            {new Date(invoice.due_date).toLocaleDateString('nl-BE')}
          </Text>
        </div>

        <div>
          <Label size="small" weight="plus" className="mb-2 block">
            Customer
          </Label>
          {invoice.customer && (invoice.customer.first_name || invoice.customer.last_name) ? (
            <div>
              <Text size="small">
                {invoice.customer.first_name} {invoice.customer.last_name}
              </Text>
              {invoice.customer.company_name && (
                <Text size="small" className="text-ui-fg-subtle">
                  {invoice.customer.company_name}
                </Text>
              )}
            </div>
          ) : (
            <Text size="small">{invoice.customer_email}</Text>
          )}
        </div>

        {invoice.payment_terms && (
          <div>
            <Label size="small" weight="plus" className="mb-2 block">
              Payment Terms
            </Label>
            <Text size="small">{invoice.payment_terms}</Text>
          </div>
        )}
      </div>
    </Container>
  )
}

export default InvoiceOverviewWidget
```

**Dependencies**: None
**Testing**: Display invoice, verify all fields shown correctly

---

### Task 5.3: Invoice Line Items Widget

**File**: `/src/admin/components/widgets/invoice-line-items-widget.tsx` (new file)

**Requirements**:
- Display line items in table format
- Columns: Description, Quantity, Unit Price, Tax Rate, Total
- Editable when status is 'draft' (inline editing or modal)
- Add new line item button
- Delete line item action
- Auto-updates totals

**Implementation**:
```typescript
import {
  Container,
  Heading,
  Button,
  Table,
  toast,
  Badge,
  IconButton
} from "@medusajs/ui"
import { Plus, Trash, PencilSquare } from "@medusajs/icons"
import { useState } from "react"
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query"
import { AddLineItemModal } from "../modals/add-line-item-modal"

interface Invoice {
  id: string
  status: string
  line_items?: any[]
}

interface InvoiceLineItemsWidgetProps {
  data: Invoice
}

const InvoiceLineItemsWidget = ({ data: invoice }: InvoiceLineItemsWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const isDraft = invoice.status === 'draft'

  const deleteLineItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/invoices/${invoice.id}/line-items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete line item")
      return response.json()
    },
    onSuccess: () => {
      toast.success("Line item deleted")
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`)
    }
  })

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Line Items</Heading>
          {isDraft && (
            <Button
              size="small"
              variant="secondary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          )}
        </div>

        <div className="px-6 py-4">
          {!invoice.line_items || invoice.line_items.length === 0 ? (
            <div className="text-center py-8">
              <Text className="text-ui-fg-subtle">No line items yet</Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Description</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Qty</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Unit Price</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Tax Rate</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
                  {isDraft && <Table.HeaderCell></Table.HeaderCell>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {invoice.line_items.map((item: any) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <div>
                        <Text size="small" weight="plus">{item.title}</Text>
                        {item.description && (
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            {item.description}
                          </Text>
                        )}
                        {item.sku && (
                          <Badge size="small" className="mt-1">{item.sku}</Badge>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small">{item.quantity}</Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small">{formatCurrency(item.unit_price)}</Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small">{(item.tax_rate * 100).toFixed(0)}%</Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small" weight="plus">
                        {formatCurrency(item.total_price)}
                      </Text>
                    </Table.Cell>
                    {isDraft && (
                      <Table.Cell>
                        <IconButton
                          size="small"
                          variant="transparent"
                          onClick={() => deleteLineItemMutation.mutate(item.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </IconButton>
                      </Table.Cell>
                    )}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>

      {showAddModal && (
        <AddLineItemModal
          invoiceId={invoice.id}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}

export default InvoiceLineItemsWidget
```

**Dependencies**: Task 5.7 (AddLineItemModal)
**Testing**: Add/delete line items, verify table updates

---

### Task 5.4: Invoice Totals Widget

**File**: `/src/admin/components/widgets/invoice-totals-widget.tsx` (new file)

**Requirements**:
- Display financial summary
- Subtotal, tax breakdown, discounts, total
- Read-only display
- Belgian VAT formatting

**Implementation**:
```typescript
import { Container, Heading, Text, Label } from "@medusajs/ui"

interface Invoice {
  id: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency_code: string
}

interface InvoiceTotalsWidgetProps {
  data: Invoice
}

const InvoiceTotalsWidget = ({ data: invoice }: InvoiceTotalsWidgetProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: invoice.currency_code
    }).format(amount)
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Totals</Heading>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Text size="small" className="text-ui-fg-subtle">Subtotal:</Text>
            <Text size="small">{formatCurrency(invoice.subtotal)}</Text>
          </div>

          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-red-500">
              <Text size="small">Discount:</Text>
              <Text size="small">-{formatCurrency(invoice.discount_amount)}</Text>
            </div>
          )}

          <div className="flex justify-between">
            <Text size="small" className="text-ui-fg-subtle">VAT (21%):</Text>
            <Text size="small">{formatCurrency(invoice.tax_amount)}</Text>
          </div>

          <div className="flex justify-between border-t pt-3">
            <Label weight="plus">Total:</Label>
            <Text weight="plus" className="text-lg">
              {formatCurrency(invoice.total_amount)}
            </Text>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default InvoiceTotalsWidget
```

**Dependencies**: None
**Testing**: Display invoice totals, verify calculations

---

### Task 5.5: Invoice Actions Widget

**File**: `/src/admin/components/widgets/invoice-actions-widget.tsx` (new file)

**Requirements**:
- Action buttons based on status
- Draft: "Send Invoice", "Preview PDF"
- Sent/Paid: "Download PDF", "View Email"
- Status change restrictions displayed
- Opens send modal

**Implementation**:
```typescript
import {
  Container,
  Heading,
  Button,
  Badge,
  toast
} from "@medusajs/ui"
import { PaperPlane, DocumentText, ArrowDownTray } from "@medusajs/icons"
import { useState } from "react"
import { SendInvoiceModal } from "../modals/send-invoice-modal"

interface Invoice {
  id: string
  invoice_number: string
  status: string
  customer_email: string
}

interface InvoiceActionsWidgetProps {
  data: Invoice
}

const InvoiceActionsWidget = ({ data: invoice }: InvoiceActionsWidgetProps) => {
  const [showSendModal, setShowSendModal] = useState(false)

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(`/admin/invoices/${invoice.id}/pdf?download=true`)
      if (!response.ok) throw new Error("Failed to download PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factuur-${invoice.invoice_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("PDF downloaded")
    } catch (error) {
      toast.error("Failed to download PDF")
    }
  }

  const handlePreviewPdf = async () => {
    try {
      const response = await fetch(`/admin/invoices/${invoice.id}/pdf`)
      if (!response.ok) throw new Error("Failed to load PDF")

      const data = await response.json()
      window.open(data.file.url, '_blank')
    } catch (error) {
      toast.error("Failed to preview PDF")
    }
  }

  const isDraft = invoice.status === 'draft'
  const isSent = invoice.status === 'sent'
  const isPaid = invoice.status === 'paid'

  return (
    <>
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Actions</Heading>
        </div>

        <div className="px-6 py-4 space-y-3">
          {isDraft && (
            <>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowSendModal(true)}
              >
                <PaperPlane className="w-4 h-4 mr-2" />
                Send Invoice
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handlePreviewPdf}
              >
                <DocumentText className="w-4 h-4 mr-2" />
                Preview PDF
              </Button>
              <Badge color="orange" className="w-full justify-center">
                Invoice can be edited
              </Badge>
            </>
          )}

          {(isSent || isPaid) && (
            <>
              <Button
                variant="primary"
                className="w-full"
                onClick={handleDownloadPdf}
              >
                <ArrowDownTray className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Badge color="blue" className="w-full justify-center">
                Invoice is locked (cannot edit)
              </Badge>
            </>
          )}

          {isPaid && (
            <Badge color="green" className="w-full justify-center text-lg py-2">
              ✓ Paid
            </Badge>
          )}
        </div>
      </Container>

      {showSendModal && (
        <SendInvoiceModal
          invoice={invoice}
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </>
  )
}

export default InvoiceActionsWidget
```

**Dependencies**: Task 5.8 (SendInvoiceModal)
**Testing**: Test all actions based on different statuses

---

### Task 5.6: Invoice Source Link Widget

**File**: `/src/admin/components/widgets/invoice-source-link-widget.tsx` (new file)

**Requirements**:
- Link back to source (order or service order)
- Display source type and number
- Clickable navigation

**Implementation**:
```typescript
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"

interface Invoice {
  id: string
  order_id?: string
  service_order_id?: string
}

interface InvoiceSourceLinkWidgetProps {
  data: Invoice
}

const InvoiceSourceLinkWidget = ({ data: invoice }: InvoiceSourceLinkWidgetProps) => {
  const navigate = useNavigate()

  if (!invoice.order_id && !invoice.service_order_id) {
    return null
  }

  const handleNavigate = () => {
    if (invoice.order_id) {
      navigate(`/orders/${invoice.order_id}`)
    } else if (invoice.service_order_id) {
      navigate(`/service-orders/${invoice.service_order_id}`)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Source</Heading>
      </div>

      <div className="px-6 py-4">
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleNavigate}
        >
          <ArrowUpRightOnBox className="w-4 h-4 mr-2" />
          {invoice.order_id ? 'View Order' : 'View Service Order'}
        </Button>
      </div>
    </Container>
  )
}

export default InvoiceSourceLinkWidget
```

**Dependencies**: None
**Testing**: Click link, verify navigation to source

---

### Task 5.7: Add Line Item Modal

**File**: `/src/admin/components/modals/add-line-item-modal.tsx` (new file)

**Requirements**:
- Form to add new line item
- Fields: type, title, description, quantity, unit price, tax rate
- Validate required fields
- Submit to API

**Implementation**:
```typescript
import {
  FocusModal,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  toast
} from "@medusajs/ui"
import { useForm, Controller } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface AddLineItemModalProps {
  invoiceId: string
  isOpen: boolean
  onClose: () => void
}

export const AddLineItemModal = ({ invoiceId, isOpen, onClose }: AddLineItemModalProps) => {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      item_type: 'product',
      title: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0.21,
    }
  })

  const addLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/invoices/${invoiceId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to add line item')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Line item added')
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to add line item: ${error.message}`)
    }
  })

  const handleSubmit = form.handleSubmit((data) => {
    addLineItemMutation.mutate(data)
  })

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-end">
            <FocusModal.Close asChild>
              <Button size="small" variant="secondary">Cancel</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <div className="flex flex-col items-center p-16">
            <div className="w-full max-w-lg">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Item Type</Label>
                  <Controller
                    control={form.control}
                    name="item_type"
                    render={({ field }) => (
                      <Select {...field} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="product">Product</Select.Item>
                          <Select.Item value="service">Service</Select.Item>
                          <Select.Item value="labor">Labor</Select.Item>
                          <Select.Item value="shipping">Shipping</Select.Item>
                        </Select.Content>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label>Title *</Label>
                  <Input {...form.register('title', { required: true })} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea {...form.register('description')} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="1"
                      {...form.register('quantity', { required: true, valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label>Unit Price (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('unit_price', { required: true, valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('tax_rate', { valueAsNumber: true })}
                    placeholder="21"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    size="small"
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    type="submit"
                    isLoading={addLineItemMutation.isPending}
                  >
                    Add Line Item
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
```

**Dependencies**: Task 2.1 (API endpoint)
**Testing**: Open modal, add line item, verify it appears

---

### Task 5.8: Send Invoice Modal

**File**: `/src/admin/components/modals/send-invoice-modal.tsx` (new file)

**Requirements**:
- Form to send invoice via email
- Fields: recipient email, CC emails, custom message, language
- Preview section showing invoice summary
- Confirm and send

**Implementation**:
```typescript
import {
  FocusModal,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Text,
  Heading,
  toast
} from "@medusajs/ui"
import { useForm, Controller } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface SendInvoiceModalProps {
  invoice: {
    id: string
    invoice_number: string
    customer_email: string
    total_amount: number
    due_date: string
    currency_code: string
  }
  isOpen: boolean
  onClose: () => void
}

export const SendInvoiceModal = ({ invoice, isOpen, onClose }: SendInvoiceModalProps) => {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      recipient_email: invoice.customer_email,
      cc_emails: '',
      custom_message: '',
      language: 'nl',
    }
  })

  const sendInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          cc_emails: data.cc_emails ? data.cc_emails.split(',').map((e: string) => e.trim()) : []
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to send invoice')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Invoice sent to ${data.sent_to}`)
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invoice: ${error.message}`)
    }
  })

  const handleSubmit = form.handleSubmit((data) => {
    sendInvoiceMutation.mutate(data)
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: invoice.currency_code
    }).format(amount)
  }

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-end">
            <FocusModal.Close asChild>
              <Button size="small" variant="secondary">Cancel</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <div className="flex flex-col items-center p-16">
            <div className="w-full max-w-lg">
              <div className="mb-8 text-center">
                <Heading level="h2" className="mb-2">Send Invoice</Heading>
                <Text className="text-ui-fg-subtle">
                  Send {invoice.invoice_number} to customer via email
                </Text>
              </div>

              {/* Invoice Summary */}
              <div className="bg-ui-bg-subtle p-4 rounded-md mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text size="small" className="text-ui-fg-subtle">Invoice:</Text>
                    <Text size="small" weight="plus">{invoice.invoice_number}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text size="small" className="text-ui-fg-subtle">Total:</Text>
                    <Text size="small" weight="plus">{formatCurrency(invoice.total_amount)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text size="small" className="text-ui-fg-subtle">Due Date:</Text>
                    <Text size="small">{new Date(invoice.due_date).toLocaleDateString('nl-BE')}</Text>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Recipient Email *</Label>
                  <Input {...form.register('recipient_email', { required: true })} />
                </div>

                <div>
                  <Label>CC Emails</Label>
                  <Input
                    {...form.register('cc_emails')}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                    Separate multiple emails with commas
                  </Text>
                </div>

                <div>
                  <Label>Language</Label>
                  <Controller
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <Select {...field} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="nl">Dutch</Select.Item>
                          <Select.Item value="fr">French</Select.Item>
                          <Select.Item value="en">English</Select.Item>
                        </Select.Content>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label>Custom Message (Optional)</Label>
                  <Textarea
                    {...form.register('custom_message')}
                    rows={4}
                    placeholder="Add a personal message to include in the email..."
                  />
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
                  <Text size="small" className="text-orange-800">
                    <strong>Note:</strong> Once sent, this invoice will be locked and cannot be edited.
                  </Text>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    size="small"
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    type="submit"
                    isLoading={sendInvoiceMutation.isPending}
                  >
                    Send Invoice
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
```

**Dependencies**: Task 3.5 (API endpoint)
**Testing**: Open modal, send invoice, verify email sent

---

## Optional: Additional UI Changes

### Optional Task A: Service Order Invoice Widget

**File**: `/src/admin/components/widgets/service-order-invoice-widget.tsx`

Display invoice status on service order detail page, with links to invoice and "Create Invoice" button when status is done.

---

### Optional Task B: Status Actions Warning

**File**: `/src/admin/components/widgets/service-order-status-actions.tsx`

Add warning alert when moving service order to "done" status, informing user that invoice will be created.

---

### Optional Task C: Overview Widget Enhancements

**File**: `/src/admin/components/widgets/service-order-overview.tsx`

Add invoice badge to header and financial summary section when status is done.

---

## Testing Checklist

### Backend Testing
- [ ] Service order moved to "done" creates draft invoice automatically
- [ ] Draft invoices can be edited (line items, prices)
- [ ] Sent/paid invoices cannot be edited (returns 400 error)
- [ ] Line items can be added/updated/deleted via API
- [ ] Invoice totals recalculate automatically
- [ ] Send workflow generates PDF and emails customer
- [ ] Invoice status changes to "sent" after sending
- [ ] Invalid status transitions return errors
- [ ] Payment reference generated correctly (Belgian format)

### Frontend Testing
- [ ] Invoice detail page displays all information correctly
- [ ] Line items can be added/deleted when draft
- [ ] Totals update automatically when line items change
- [ ] Send modal opens and validates input
- [ ] PDF preview/download works
- [ ] Status badges display correctly
- [ ] Source link navigates to order/service order
- [ ] Actions disabled when invoice is locked
- [ ] Modals close properly and refresh data

---

## Deployment Notes

1. Run migrations after adding Belgian fields (Task 4.1)
2. Configure company details in environment variables or config
3. Set up email service for sending invoices
4. Test PDF generation thoroughly with sample data
5. Verify Belgian legal compliance with accounting expert
6. Add monitoring for failed invoice creation/sending

---

## Parallel Work Distribution

**Agent 1 - Backend Core**: Tasks 1.1, 1.2, 1.3, 2.2
**Agent 2 - Backend API**: Tasks 2.1, 3.5
**Agent 3 - Backend Workflows**: Tasks 3.1, 3.2, 3.3, 3.4
**Agent 4 - Belgian Compliance**: Tasks 4.1, 4.2, 4.3
**Agent 5 - Frontend Widgets**: Tasks 5.2, 5.3, 5.4, 5.6
**Agent 6 - Frontend Modals**: Tasks 5.5, 5.7, 5.8
**Agent 7 - Frontend Layout**: Task 5.1 (depends on 5.2-5.6)

Agents can work simultaneously on their assigned tasks. Task dependencies are noted in each task description.
