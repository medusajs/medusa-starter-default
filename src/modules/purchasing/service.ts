import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "./models/supplier.model"
import SupplierProduct from "./models/supplier-product.model"
import SupplierPriceList from "./models/supplier-price-list.model"
import SupplierPriceListItem from "./models/supplier-price-list-item.model"
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "./models/purchase-order.model"

class PurchasingService extends MedusaService({
  Supplier,
  SupplierProduct,
  SupplierPriceList,
  SupplierPriceListItem,
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
  // PRICE LIST BUSINESS LOGIC
  // ==========================================
  
  async createSupplierPriceList(data: {
    supplier_id: string
    name: string
    description?: string
    effective_date?: Date
    expiry_date?: Date
    currency_code?: string
    upload_filename?: string
    upload_metadata?: any
  }) {
    const supplier = await this.retrieveSupplier(data.supplier_id)
    
    const priceList = await this.createSupplierPriceLists([{
      supplier_id: data.supplier_id,
      name: data.name,
      description: data.description,
      effective_date: data.effective_date,
      expiry_date: data.expiry_date,
      currency_code: data.currency_code || supplier.currency_code || "USD",
      upload_filename: data.upload_filename,
      upload_metadata: data.upload_metadata,
      is_active: true
    }])
    
    return priceList[0]
  }

  async processPriceListItems(priceListId: string, items: Array<{
    product_variant_id: string
    product_id: string
    supplier_sku?: string
    variant_sku?: string
    cost_price: number
    quantity?: number
    lead_time_days?: number
    notes?: string
  }>) {
    const priceList = await this.retrieveSupplierPriceList(priceListId)
    
    const processedItems = items.map(item => ({
      price_list_id: priceListId,
      product_variant_id: item.product_variant_id,
      product_id: item.product_id,
      supplier_sku: item.supplier_sku,
      variant_sku: item.variant_sku,
      cost_price: item.cost_price,
      quantity: item.quantity || 1,
      lead_time_days: item.lead_time_days,
      notes: item.notes
    }))
    
    return await this.createSupplierPriceListItems(processedItems)
  }

  async upsertSupplierProductFromPriceList(priceListItem: any) {
    const priceList = await this.retrieveSupplierPriceList(priceListItem.price_list_id)
    
    // Check if supplier-product relationship exists
    const [existing] = await this.listSupplierProducts({
      supplier_id: priceList.supplier_id,
      product_variant_id: priceListItem.product_variant_id
    })

    if (existing) {
      // Update existing relationship with price list data
      return await this.updateSupplierProducts([{
        id: existing.id,
        supplier_sku: priceListItem.supplier_sku || existing.supplier_sku,
        cost_price: priceListItem.cost_price,
        currency_code: priceList.currency_code,
        minimum_order_quantity: priceListItem.quantity || existing.minimum_order_quantity,
        lead_time_days: priceListItem.lead_time_days || existing.lead_time_days,
        last_cost_update: new Date(),
        is_active: true
      }])
    } else {
      // Create new supplier-product relationship
      return await this.createSupplierProducts([{
        supplier_id: priceList.supplier_id,
        product_variant_id: priceListItem.product_variant_id,
        supplier_sku: priceListItem.supplier_sku,
        cost_price: priceListItem.cost_price,
        currency_code: priceList.currency_code,
        minimum_order_quantity: priceListItem.quantity || 1,
        lead_time_days: priceListItem.lead_time_days,
        is_active: true,
        last_cost_update: new Date()
      }])
    }
  }

  async getSupplierPriceLists(supplierId: string) {
    return await this.listSupplierPriceLists({ 
      supplier_id: supplierId 
    })
  }

  async getActivePriceListsForSupplier(supplierId: string) {
    const now = new Date()
    return await this.listSupplierPriceLists({
      supplier_id: supplierId,
      is_active: true,
      $and: [
        { $or: [{ effective_date: null }, { effective_date: { $lte: now } }] },
        { $or: [{ expiry_date: null }, { expiry_date: { $gte: now } }] }
      ]
    })
  }

  async getPriceListItems(priceListId: string) {
    return await this.listSupplierPriceListItems({ price_list_id: priceListId })
  }

  async getProductPricingFromPriceLists(productVariantId: string) {
    const now = new Date()
    
    // Get all active price list items for this variant
    const priceListItems = await this.listSupplierPriceListItems({
      product_variant_id: productVariantId
    })
    
    // Filter for active price lists
    const activeItems = []
    for (const item of priceListItems) {
      const priceList = await this.retrieveSupplierPriceList(item.price_list_id)
      if (priceList.is_active && 
          (!priceList.effective_date || priceList.effective_date <= now) &&
          (!priceList.expiry_date || priceList.expiry_date >= now)) {
        activeItems.push({ ...item, price_list: priceList })
      }
    }
    
    return activeItems
  }

  async deactivatePriceList(priceListId: string) {
    return await this.updateSupplierPriceLists(
      { id: priceListId },
      { is_active: false }
    )
  }

  // ==========================================
  // CROSS-ENTITY BUSINESS LOGIC
  // ==========================================
  
  async findBestSupplierForProduct(productVariantId: string) {
    // Get both supplier products and price list items
    const [supplierProducts, priceListItems] = await Promise.all([
      this.listSupplierProducts({
        product_variant_id: productVariantId,
        is_active: true
      }),
      this.getProductPricingFromPriceLists(productVariantId)
    ])

    // Combine all pricing options
    const allOptions = []
    
    // Add supplier products
    for (const sp of supplierProducts) {
      allOptions.push({
        type: 'supplier_product',
        supplier_id: sp.supplier_id,
        cost_price: sp.cost_price,
        is_preferred_supplier: sp.is_preferred_supplier,
        supplier_sku: sp.supplier_sku,
        minimum_order_quantity: sp.minimum_order_quantity,
        lead_time_days: sp.lead_time_days,
        data: sp
      })
    }
    
    // Add price list items (may override supplier products)
    for (const item of priceListItems) {
      allOptions.push({
        type: 'price_list',
        supplier_id: item.price_list.supplier_id,
        cost_price: item.cost_price,
        is_preferred_supplier: false, // Price lists don't have preferred status
        supplier_sku: item.supplier_sku,
        minimum_order_quantity: item.quantity,
        lead_time_days: item.lead_time_days,
        data: item
      })
    }

    if (allOptions.length === 0) {
      return null
    }

    // Sort by cost price (ascending) and preferred supplier status
    const sorted = allOptions.sort((a, b) => {
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