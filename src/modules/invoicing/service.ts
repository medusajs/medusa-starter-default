import { MedusaService } from "@medusajs/framework/utils"
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
    // Calculate total price
    const totalPrice = data.quantity * data.unit_price - (data.discount_amount || 0)
    const taxAmount = totalPrice * (data.tax_rate || 0)
    
    const lineItem = await this.createInvoiceLineItems({
      ...data,
      total_price: totalPrice,
      tax_amount: taxAmount,
      discount_amount: data.discount_amount || 0,
      tax_rate: data.tax_rate || 0,
    })
    
    // Update invoice totals
    await this.recalculateInvoiceTotals(data.invoice_id)
    
    return lineItem
  }
  
  async recalculateInvoiceTotals(invoiceId: string) {
    const invoice = await this.retrieveInvoice(invoiceId)
    const lineItems = await this.listInvoiceLineItems({ invoice_id: invoiceId })

    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.total_price), 0)
    const taxAmount = lineItems.reduce((sum, item) => sum + Number(item.tax_amount), 0)
    const discountAmount = lineItems.reduce((sum, item) => sum + Number(item.discount_amount), 0)
    const totalAmount = subtotal + taxAmount

    return await this.updateInvoices({
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
    }, { id: invoiceId })
  }
  
  async changeInvoiceStatus(invoiceId: string, newStatus: string, changedBy: string, reason?: string) {
    const invoice = await this.retrieveInvoice(invoiceId)
    const oldStatus = invoice.status
    
    // Update invoice status
    const updatedInvoice = await this.updateInvoices({
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
}

export default InvoicingService 