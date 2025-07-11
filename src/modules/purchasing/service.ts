import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "./models/supplier.model"
import SupplierProduct from "./models/supplier-product.model"
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "./models/purchase-order.model"

class PurchasingService extends MedusaService({
  Supplier,
  SupplierProduct,
  PurchaseOrder,
  PurchaseOrderItem,
}) {
  
  // ==========================================
  // PURCHASE ORDER BUSINESS LOGIC
  // ==========================================
  
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
    const updated = await this.updatePurchaseOrders(
      { id: orderId },
      {
        status,
        ...(status === 'received' && { actual_delivery_date: new Date() })
      }
    )
    return updated
  }

  async getPurchaseOrdersByStatus(status: string) {
    return await this.listPurchaseOrders({ status })
  }

  async getPurchaseOrdersBySupplier(supplierId: string) {
    return await this.listPurchaseOrders({ supplier_id: supplierId })
  }

  async getDraftPurchaseOrderBySupplier(supplierId: string) {
    const [draftPO] = await this.listPurchaseOrders({
      supplier_id: supplierId,
      status: PurchaseOrderStatus.DRAFT
    })
    return draftPO
  }

  // ==========================================
  // SUPPLIER BUSINESS LOGIC
  // ==========================================
  
  async generateSupplierCode(name: string): Promise<string> {
    const baseCode = name.substring(0, 3).toUpperCase()
    const existing = await this.listSuppliers({
      code: { $like: `${baseCode}%` }
    })
    
    return `${baseCode}${String(existing.length + 1).padStart(3, '0')}`
  }

  async getSupplierProductPricing(supplierId: string, productVariantId: string) {
    const [supplierProduct] = await this.listSupplierProducts({
      supplier_id: supplierId,
      product_variant_id: productVariantId,
      is_active: true
    })
    
    return supplierProduct
  }

  async updateSupplierProductPricing(supplierId: string, productVariantId: string, costPrice: number) {
    const [existing] = await this.listSupplierProducts({
      supplier_id: supplierId,
      product_variant_id: productVariantId
    })

    if (existing) {
      return await this.updateSupplierProducts([{
        id: existing.id,
        cost_price: costPrice,
        last_cost_update: new Date()
      }])
    } else {
      return await this.createSupplierProducts([{
        supplier_id: supplierId,
        product_variant_id: productVariantId,
        cost_price: costPrice,
        currency_code: "USD", // Default, should be configurable
        minimum_order_quantity: 1,
        is_active: true,
        last_cost_update: new Date()
      }])
    }
  }

  async getActiveSuppliers() {
    return await this.listSuppliers({ is_active: true })
  }

  async getSupplierWithStats(supplierId: string) {
    const supplier = await this.retrieveSupplier(supplierId)
    const purchaseOrders = await this.getPurchaseOrdersBySupplier(supplierId)
    const supplierProducts = await this.listSupplierProducts({ supplier_id: supplierId })
    
    return {
      ...supplier,
      purchase_orders_count: purchaseOrders.length,
      products_count: supplierProducts.length,
      last_order_date: purchaseOrders.length > 0 
        ? Math.max(...purchaseOrders.map(po => new Date(po.order_date).getTime()))
        : null
    }
  }

  // ==========================================
  // CROSS-ENTITY BUSINESS LOGIC
  // ==========================================
  
  async findBestSupplierForProduct(productVariantId: string) {
    const supplierProducts = await this.listSupplierProducts({
      product_variant_id: productVariantId,
      is_active: true
    })

    if (supplierProducts.length === 0) {
      return null
    }

    // Sort by cost price (ascending) and preferred supplier status
    const sorted = supplierProducts.sort((a, b) => {
      if (a.is_preferred_supplier && !b.is_preferred_supplier) return -1
      if (!a.is_preferred_supplier && b.is_preferred_supplier) return 1
      return a.cost_price - b.cost_price
    })

    return sorted[0]
  }

  async getDashboardStats() {
    const [suppliers, purchaseOrders] = await Promise.all([
      this.listSuppliers(),
      this.listPurchaseOrders()
    ])

    const activeSuppliers = suppliers.filter(s => s.is_active)
    const pendingOrders = purchaseOrders.filter(po => 
      ['draft', 'sent', 'confirmed'].includes(po.status)
    )

    return {
      total_suppliers: suppliers.length,
      active_suppliers: activeSuppliers.length,
      total_purchase_orders: purchaseOrders.length,
      pending_orders: pendingOrders.length,
      recent_orders: purchaseOrders.slice(0, 5)
    }
  }
}

export default PurchasingService 