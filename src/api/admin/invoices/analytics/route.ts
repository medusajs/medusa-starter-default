import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INVOICING_MODULE } from "../../../../modules/invoicing"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    const { 
      start_date,
      end_date,
      customer_id,
      invoice_type 
    } = req.query
    
    // Build filters for analytics
    const filters: any = {}
    if (start_date) filters.created_at = { $gte: new Date(start_date as string) }
    if (end_date) {
      filters.created_at = { 
        ...filters.created_at,
        $lte: new Date(end_date as string) 
      }
    }
    if (customer_id) filters.customer_id = customer_id
    if (invoice_type) filters.invoice_type = invoice_type
    
    // Get basic analytics
    const analytics = await invoicingService.getInvoiceAnalytics(filters)
    
    // Get overdue invoices
    const overdueInvoices = await invoicingService.getOverdueInvoices()
    
    // Get monthly revenue trend
    const { data: monthlyData } = await query.graph({
      entity: "invoice",
      fields: [
        "invoice_date",
        "total_amount",
        "status",
      ],
      filters: {
        status: { $in: ["sent", "paid"] },
        invoice_date: { 
          $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
        }
      },
    })
    
    // Calculate monthly trends
    const monthlyTrends = calculateMonthlyTrends(monthlyData)
    
    // Get top customers by invoice value
    const { data: customerInvoices } = await query.graph({
      entity: "invoice", 
      fields: [
        "customer_id",
        "total_amount",
        "customer.first_name",
        "customer.last_name",
        "customer.email",
      ],
      filters: {
        ...filters,
        status: { $in: ["sent", "paid"] }
      },
    })
    
    const topCustomers = calculateTopCustomers(customerInvoices)
    
    // Get product/service performance
    const { data: lineItems } = await query.graph({
      entity: "invoice_line_item",
      fields: [
        "item_type",
        "title",
        "quantity",
        "total_price",
        "invoice.status",
        "invoice.invoice_date",
      ],
      filters: {
        "invoice.status": { $in: ["sent", "paid"] },
        ...(start_date && { "invoice.invoice_date": { $gte: new Date(start_date as string) } }),
        ...(end_date && { "invoice.invoice_date": { $lte: new Date(end_date as string) } }),
      },
    })
    
    const productPerformance = calculateProductPerformance(lineItems)
    
    res.json({
      analytics: {
        ...analytics,
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      },
      monthlyTrends,
      topCustomers,
      productPerformance,
      overdueInvoices: overdueInvoices.slice(0, 10), // Top 10 overdue
    })
  } catch (error) {
    console.error("Error fetching invoice analytics:", error)
    res.status(500).json({ 
      error: "Failed to fetch invoice analytics",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

function calculateMonthlyTrends(invoices: any[]) {
  const trends: Record<string, { month: string, revenue: number, count: number }> = {}
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.invoice_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!trends[monthKey]) {
      trends[monthKey] = {
        month: monthKey,
        revenue: 0,
        count: 0
      }
    }
    
    trends[monthKey].revenue += Number(invoice.total_amount)
    trends[monthKey].count += 1
  })
  
  return Object.values(trends).sort((a, b) => a.month.localeCompare(b.month))
}

function calculateTopCustomers(invoices: any[]) {
  const customers: Record<string, any> = {}
  
  invoices.forEach(invoice => {
    const customerId = invoice.customer_id
    
    if (!customers[customerId]) {
      customers[customerId] = {
        customer_id: customerId,
        name: `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim(),
        email: invoice.customer?.email,
        total_amount: 0,
        invoice_count: 0,
      }
    }
    
    customers[customerId].total_amount += Number(invoice.total_amount)
    customers[customerId].invoice_count += 1
  })
  
  return Object.values(customers)
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 10) // Top 10 customers
}

function calculateProductPerformance(lineItems: any[]) {
  const products: Record<string, any> = {}
  
  lineItems.forEach(item => {
    const key = `${item.item_type}-${item.title}`
    
    if (!products[key]) {
      products[key] = {
        item_type: item.item_type,
        title: item.title,
        total_quantity: 0,
        total_revenue: 0,
        invoice_count: 0,
      }
    }
    
    products[key].total_quantity += Number(item.quantity)
    products[key].total_revenue += Number(item.total_price)
    products[key].invoice_count += 1
  })
  
  return Object.values(products)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 20) // Top 20 items
} 