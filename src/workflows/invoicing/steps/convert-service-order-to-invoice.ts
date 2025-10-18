import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules
} from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { SERVICE_ORDERS_MODULE } from "../../../modules/service-orders"

type ConvertServiceOrderToInvoiceInput = {
  service_order_id: string
  invoice_type?: "service_work" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const convertServiceOrderToInvoiceStep = createStep(
  "convert-service-order-to-invoice",
  async (input: ConvertServiceOrderToInvoiceInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const serviceOrdersService = container.resolve(SERVICE_ORDERS_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Fetch service order with full details including items and time_entries
    const serviceOrder = await serviceOrdersService.getServiceOrdersWithItems(input.service_order_id)
    
    if (!serviceOrder) {
      throw new Error(`Service Order ${input.service_order_id} not found`)
    }
    
    // Get customer details via Remote Query
    const { data: [customer] } = await query.graph({
      entity: "customer", 
      fields: [
        "id",
        "first_name",
        "last_name", 
        "email",
        "phone",
        "addresses.*",
      ],
      filters: {
        id: serviceOrder.customer_id!,
      },
    })
    
    if (!customer) {
      throw new Error(`Customer ${serviceOrder.customer_id} not found`)
    }
    
    // Use primary address or create a basic one
    const billingAddress = customer.addresses?.[0] || {
      first_name: customer.first_name,
      last_name: customer.last_name,
      company: "",
      address_1: "",
      city: "",
      postal_code: "",
      country_code: "BE", // Belgium default
    }
    
    // Validate required fields
    if (!serviceOrder.customer_id) {
      throw new Error("Service order must have a customer_id to create invoice")
    }
    
    // Create the invoice
    const invoice = await invoicingService.createInvoiceWithNumber({
      customer_id: serviceOrder.customer_id,
      service_order_id: serviceOrder.id,
      invoice_type: input.invoice_type || "service_work",
      due_date: input.due_date,
      currency_code: "EUR",
      billing_address: billingAddress,
      customer_email: customer.email || '',
      customer_phone: customer.phone || undefined,
      notes: input.notes || `Service Order: ${serviceOrder.service_order_number}`,
      payment_terms: input.payment_terms,
      created_by: input.created_by,
    })
    
    // Add labor costs from time entries
    if (serviceOrder.time_entries?.length > 0) {
      for (const timeEntry of serviceOrder.time_entries) {
        const hours = timeEntry.billable_hours || timeEntry.duration_minutes / 60
        const rate = timeEntry.hourly_rate || serviceOrder.labor_rate || 0
        
        if (hours > 0 && rate > 0) {
          await invoicingService.addLineItemToInvoice({
            invoice_id: invoice.id,
            item_type: "labor",
            service_order_time_entry_id: timeEntry.id,
            title: `Labor - ${timeEntry.work_description}`,
            description: `Work Category: ${timeEntry.work_category}`,
            quantity: 1,
            unit_price: timeEntry.total_cost || (hours * rate),
            hours_worked: hours,
            hourly_rate: rate,
            tax_rate: 0.21, // Belgium VAT rate
          })
        }
      }
    } else if (serviceOrder.actual_hours > 0 && serviceOrder.labor_rate && serviceOrder.labor_rate > 0) {
      // Fallback to service order level labor costs
      await invoicingService.addLineItemToInvoice({
        invoice_id: invoice.id,
        item_type: "labor",
        title: `Labor - ${serviceOrder.description || 'Service Work'}`,
        description: serviceOrder.work_performed || serviceOrder.diagnosis || undefined,
        quantity: 1,
        unit_price: serviceOrder.total_labor_cost,
        hours_worked: serviceOrder.actual_hours,
        hourly_rate: serviceOrder.labor_rate || undefined,
        tax_rate: 0.21,
      })
    }
    
    // Add parts/items used
    if (serviceOrder.items?.length > 0) {
      for (const item of serviceOrder.items) {
        // Use quantity_used if set, otherwise fall back to quantity_needed
        const quantity = item.quantity_used > 0 ? item.quantity_used : item.quantity_needed

        if (quantity > 0) {
          await invoicingService.addLineItemToInvoice({
            invoice_id: invoice.id,
            item_type: "product",
            service_order_item_id: item.id,
            product_id: item.product_id ?? undefined,
            variant_id: item.variant_id ?? undefined,
            title: item.title,
            description: item.description ?? undefined,
            sku: item.sku ?? undefined,
            quantity: quantity,
            unit_price: item.unit_price,
            tax_rate: 0.21,
          })
        }
      }
    }
    
    // Recalculate totals
    await invoicingService.recalculateInvoiceTotals(invoice.id)

    // Create the module link between invoice and customer
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
    await remoteLink.create({
      [INVOICING_MODULE]: {
        invoice_id: invoice.id,
      },
      [Modules.CUSTOMER]: {
        customer_id: serviceOrder.customer_id,
      },
    })

    return new StepResponse(invoice, invoice.id)
  },
  async (invoiceId: string, { container }) => {
    // Compensation: delete the created invoice if workflow fails
    if (!invoiceId) return
    
    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.deleteInvoices([invoiceId])
  }
) 