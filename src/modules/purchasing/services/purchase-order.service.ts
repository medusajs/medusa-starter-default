import { MedusaService } from "@medusajs/framework/utils"
import { PurchaseOrder, PurchaseOrderItem } from "../models/purchase-order.model"

class PurchaseOrderService extends MedusaService({
  PurchaseOrder,
  PurchaseOrderItem,
}) {
  // PO-specific business logic will be handled here
  async generatePONumber(): Promise<string> {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    
    const existingPOs = await this.listPurchaseOrders({
      po_number: { $like: `PO-${year}-%` }
    })
    
    return `PO-${year}-${String(existingPOs.length + 1).padStart(3, '0')}`
  }

  async calculateOrderTotals(items: Array<{ quantity_ordered: number; unit_cost: number }>) {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity_ordered * item.unit_cost), 
      0
    )
    
    // Add your business logic for tax, shipping, discounts here
    return {
      subtotal,
      tax_amount: 0, // Calculate based on your business rules
      shipping_amount: 0, // Calculate based on your business rules
      discount_amount: 0, // Calculate based on your business rules
      total_amount: subtotal
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    const [updated] = await this.updatePurchaseOrders([{
      id: orderId,
      status,
      ...(status === 'received' && { actual_delivery_date: new Date() })
    }])
    return updated
  }
}

export default PurchaseOrderService 