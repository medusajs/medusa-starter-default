import { MedusaService, MathBN } from "@medusajs/framework/utils"
import Invoice, { InvoiceStatus, InvoiceType } from "./models/invoice"
import InvoiceLineItem, { InvoiceLineItemType } from "./models/invoice-line-item"
import InvoiceStatusHistory from "./models/invoice-status-history"

type CreateInvoiceInput = {
  customer_id: string
  order_id?: string
  service_order_id?: string
  invoice_type?: "product_sale" | "service_work" | "mixed"
  invoice_date?: Date
  due_date?: Date
  currency_code?: string
  billing_address: any
  shipping_address?: any
  customer_email: string
  customer_phone?: string
  notes?: string
  payment_terms?: string
  created_by?: string
  metadata?: Record<string, any>
}

type CreateInvoiceLineItemInput = {
  invoice_id: string
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  product_id?: string
  variant_id?: string
  service_order_item_id?: string
  service_order_time_entry_id?: string
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
  metadata?: Record<string, any>
}

class InvoicingService extends MedusaService({
  Invoice,
  InvoiceLineItem,
  InvoiceStatusHistory,
}) {
  
  async generateInvoiceNumber(): Promise<string> {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    
    // Get count of invoices for this month to generate sequential number
    const existingInvoices = await this.listInvoices({
      invoice_number: { $like: `INV-${year}-${month}-%` }
    })
    
    const sequenceNumber = String(existingInvoices.length + 1).padStart(3, '0')
    return `INV-${year}-${month}-${sequenceNumber}`
  }
  
  async createInvoiceWithNumber(data: CreateInvoiceInput) {
    const invoiceNumber = await this.generateInvoiceNumber()
    
    // Set default due date to 30 days from invoice date
    const invoiceDate = data.invoice_date || new Date()
    const dueDate = data.due_date || new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    const invoice = await this.createInvoices({
      ...data,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: InvoiceStatus.DRAFT,
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
    })
    
    // Create status history entry
    await this.createInvoiceStatusHistories({
      invoice_id: invoice.id,
      to_status: invoice.status,
      changed_by: data.created_by || "system",
      changed_at: new Date(),
      reason: "Invoice created",
    })
    
    return invoice
  }
  
  async addLineItemToInvoice(data: CreateInvoiceLineItemInput) {
    // Calculate total price using MathBN for BigNumber arithmetic
    const subtotal = MathBN.mult(data.quantity, data.unit_price)
    const totalPrice = MathBN.sub(subtotal, data.discount_amount || 0)
    const taxAmount = MathBN.mult(totalPrice, data.tax_rate || 0)
    
    const lineItem = await this.createInvoiceLineItems({
      ...data,
      total_price: totalPrice.toNumber(),
      tax_amount: taxAmount.toNumber(),
      discount_amount: data.discount_amount || 0,
      tax_rate: data.tax_rate || 0,
    })
    
    // Update invoice totals
    await this.recalculateInvoiceTotals(data.invoice_id)
    
    return lineItem
  }
  
  async recalculateInvoiceTotals(invoiceId: string) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required for recalculating totals')
    }
    
    const invoice = await this.retrieveInvoice(invoiceId)
    const lineItems = await this.listInvoiceLineItems({ invoice_id: invoiceId })

    // Calculate subtotal from unit_price * quantity (before discounts)
    // Use MathBN.sum for proper BigNumber handling
    const subtotal = MathBN.sum(
      ...lineItems.map(item => MathBN.mult(item.unit_price || 0, item.quantity || 0))
    )
    
    const discountAmount = MathBN.sum(
      ...lineItems.map(item => item.discount_amount || 0)
    )
    
    const taxAmount = MathBN.sum(
      ...lineItems.map(item => item.tax_amount || 0)
    )
    
    // Total = subtotal - discount + tax
    const subtotalAfterDiscount = MathBN.sub(subtotal, discountAmount)
    const totalAmount = MathBN.add(subtotalAfterDiscount, taxAmount)
    
    return await this.updateInvoices({
      id: invoiceId,
      subtotal: subtotal.toNumber(),
      tax_amount: taxAmount.toNumber(),
      discount_amount: discountAmount.toNumber(),
      total_amount: totalAmount.toNumber(),
    }, { id: invoiceId })
  }
  
  async changeInvoiceStatus(invoiceId: string, newStatus: string, changedBy: string, reason?: string) {
    const invoice = await this.retrieveInvoice(invoiceId)
    const oldStatus = invoice.status
    
    // Update invoice status
    const updatedInvoice = await this.updateInvoices({
      id: invoiceId,
      status: newStatus as any,
      sent_date: newStatus === InvoiceStatus.SENT ? new Date() : invoice.sent_date,
      paid_date: newStatus === InvoiceStatus.PAID ? new Date() : invoice.paid_date,
    }, { id: invoiceId })
    
    // Create status history entry
    await this.createInvoiceStatusHistories({
      invoice_id: invoiceId,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: changedBy,
      changed_at: new Date(),
      reason: reason || `Status changed to ${newStatus}`,
    })
    
    return updatedInvoice
  }
  
  async getInvoiceAnalytics(filters: any = {}) {
    const invoices = await this.listInvoices(filters)
    
    const analytics = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      averageAmount: 0,
      statusBreakdown: {} as Record<string, number>,
      typeBreakdown: {} as Record<string, number>,
      monthlyTrends: [] as any[],
    }
    
    // Calculate average
    analytics.averageAmount = analytics.totalAmount / (analytics.totalInvoices || 1)
    
    // Status breakdown
    invoices.forEach(invoice => {
      analytics.statusBreakdown[invoice.status] = (analytics.statusBreakdown[invoice.status] || 0) + 1
    })
    
    // Type breakdown
    invoices.forEach(invoice => {
      analytics.typeBreakdown[invoice.invoice_type] = (analytics.typeBreakdown[invoice.invoice_type] || 0) + 1
    })
    
    return analytics
  }
  
  async getOverdueInvoices() {
    const today = new Date()
    return await this.listInvoices({
      status: { $in: [InvoiceStatus.SENT] },
      due_date: { $lt: today },
    })
  }
  
  async getCustomerInvoiceHistory(customerId: string) {
    return await this.listInvoices(
      { customer_id: customerId },
      { 
        order: { created_at: "DESC" },
        relations: ["line_items", "status_history"]
      }
    )
  }

  /**
   * Get mergeable invoices for a specific customer
   * Returns all draft invoices with the same currency that haven't been paid
   * 
   * @param customerId - The customer ID to find mergeable invoices for
   * @returns Array of mergeable invoices
   */
  async getMergeableInvoicesForCustomer(customerId: string): Promise<any[]> {
    const invoices = await this.listInvoices({
      customer_id: customerId,
      status: InvoiceStatus.DRAFT,
      paid_date: null, // No payment received
    }, {
      order: { invoice_date: "ASC" },
      relations: ["line_items"]
    })

    // Group by currency to help identify mergeable sets
    const mergeableInvoices = invoices.filter(invoice => {
      // Additional validation: ensure invoice has line items
      return invoice.line_items && invoice.line_items.length > 0
    })

    return mergeableInvoices
  }

  /**
   * Check if a set of invoices can be merged together
   * Validates business rules without throwing errors
   * 
   * @param invoiceIds - Array of invoice IDs to check
   * @returns Object with mergeable status and reason if not mergeable
   */
  async canInvoicesBeMerged(
    invoiceIds: string[]
  ): Promise<{ mergeable: boolean; reason?: string }> {
    // Check minimum/maximum count
    if (!invoiceIds || invoiceIds.length < 2) {
      return { 
        mergeable: false, 
        reason: "At least 2 invoices are required to merge" 
      }
    }

    if (invoiceIds.length > 10) {
      return { 
        mergeable: false, 
        reason: "Cannot merge more than 10 invoices at once" 
      }
    }

    try {
      // Retrieve all invoices
      const invoices = await this.listInvoices({
        id: invoiceIds,
      }, {
        relations: ["line_items"]
      })

      // Check if all invoices exist
      if (invoices.length !== invoiceIds.length) {
        return { 
          mergeable: false, 
          reason: "One or more invoices not found" 
        }
      }

      // Check if all belong to same customer
      const customerIds = [...new Set(invoices.map(inv => inv.customer_id))]
      if (customerIds.length > 1) {
        return { 
          mergeable: false, 
          reason: "All invoices must belong to the same customer" 
        }
      }

      // Check if all are in draft status
      const nonDraftInvoices = invoices.filter(
        inv => inv.status !== InvoiceStatus.DRAFT
      )
      if (nonDraftInvoices.length > 0) {
        const invoiceNumbers = nonDraftInvoices.map(inv => inv.invoice_number).join(", ")
        return { 
          mergeable: false, 
          reason: `Only draft invoices can be merged. Non-draft: ${invoiceNumbers}` 
        }
      }

      // Check if all have same currency
      const currencies = [...new Set(invoices.map(inv => inv.currency_code))]
      if (currencies.length > 1) {
        return { 
          mergeable: false, 
          reason: `All invoices must have the same currency. Found: ${currencies.join(", ")}` 
        }
      }

      // Check if any have payments
      const invoicesWithPayments = invoices.filter(inv => inv.paid_date !== null)
      if (invoicesWithPayments.length > 0) {
        const invoiceNumbers = invoicesWithPayments.map(inv => inv.invoice_number).join(", ")
        return { 
          mergeable: false, 
          reason: `Cannot merge invoices with payments: ${invoiceNumbers}` 
        }
      }

      return { mergeable: true }

    } catch (error) {
      return { 
        mergeable: false, 
        reason: error instanceof Error ? error.message : "Unknown error occurred" 
      }
    }
  }

  /**
   * Get source invoices that were merged into a specific merged invoice
   * 
   * @param mergedInvoiceId - The ID of the merged invoice
   * @returns Array of source invoices that were merged, or empty array if none
   */
  async getSourceInvoicesForMerged(mergedInvoiceId: string): Promise<any[]> {
    try {
      // Get the merged invoice and check its metadata
      const mergedInvoice = await this.retrieveInvoice(mergedInvoiceId)
      
      if (!mergedInvoice.metadata?.merged_from) {
        return []
      }

      const sourceInvoiceIds = mergedInvoice.metadata.merged_from as string[]

      if (!Array.isArray(sourceInvoiceIds) || sourceInvoiceIds.length === 0) {
        return []
      }

      // Retrieve all source invoices
      const sourceInvoices = await this.listInvoices({
        id: sourceInvoiceIds,
      }, {
        order: { invoice_date: "ASC" },
        relations: ["line_items"]
      })

      return sourceInvoices

    } catch (error) {
      console.error("Error fetching source invoices for merged invoice:", error)
      return []
    }
  }

  /**
   * Get the merged invoice from a source invoice (if it was merged)
   * 
   * @param sourceInvoiceId - The ID of a source invoice that may have been merged
   * @returns The merged invoice if found, null otherwise
   */
  async getMergedInvoiceFromSource(sourceInvoiceId: string): Promise<any | null> {
    try {
      // Get the source invoice and check its metadata
      const sourceInvoice = await this.retrieveInvoice(sourceInvoiceId)
      
      if (
        !sourceInvoice.metadata?.cancelled_reason ||
        sourceInvoice.metadata.cancelled_reason !== "merged" ||
        !sourceInvoice.metadata.merged_into_invoice_id
      ) {
        return null
      }

      const mergedInvoiceId = sourceInvoice.metadata.merged_into_invoice_id as string

      // Retrieve the merged invoice
      const mergedInvoice = await this.retrieveInvoice(mergedInvoiceId)

      return mergedInvoice

    } catch (error) {
      console.error("Error fetching merged invoice from source:", error)
      return null
    }
  }

  /**
   * Get all merged invoices (invoices created from merge operations)
   * 
   * @returns Array of invoices that were created from merging other invoices
   */
  async getAllMergedInvoices(): Promise<any[]> {
    // Note: This uses a metadata query which may need to be adapted based on
    // the ORM's support for JSON field queries
    try {
      const allInvoices = await this.listInvoices({}, {
        order: { created_at: "DESC" }
      })

      // Filter to only invoices with merge metadata
      const mergedInvoices = allInvoices.filter(
        invoice => invoice.metadata?.merged_from && 
                  Array.isArray(invoice.metadata.merged_from) &&
                  invoice.metadata.merged_from.length > 0
      )

      return mergedInvoices

    } catch (error) {
      console.error("Error fetching all merged invoices:", error)
      return []
    }
  }

  /**
   * Get all cancelled invoices that were merged into other invoices
   * 
   * @returns Array of cancelled invoices that were part of a merge
   */
  async getAllMergedSourceInvoices(): Promise<any[]> {
    try {
      const cancelledInvoices = await this.listInvoices({
        status: InvoiceStatus.CANCELLED,
      }, {
        order: { created_at: "DESC" }
      })

      // Filter to only invoices cancelled due to merge
      const mergedSourceInvoices = cancelledInvoices.filter(
        invoice => invoice.metadata?.cancelled_reason === "merged" &&
                  invoice.metadata?.merged_into_invoice_id
      )

      return mergedSourceInvoices

    } catch (error) {
      console.error("Error fetching merged source invoices:", error)
      return []
    }
  }
}

export default InvoicingService 