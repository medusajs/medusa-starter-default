import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import PurchasingService from "../../../modules/purchasing/service"
import { createPurchaseOrderWorkflow } from "../../../modules/purchasing/workflows/create-purchase-order"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { 
    limit = 20, 
    offset = 0, 
    status,
    priority,
    type,
    supplier_id,
    expand = ""
  } = req.query

  const filters: any = {}
  if (status) filters.status = status
  if (priority) filters.priority = priority
  if (type) filters.type = type
  if (supplier_id) filters.supplier_id = supplier_id

  // Ensure expand is a string
  const expandStr = typeof expand === 'string' ? expand : ''

  try {
    // Get purchase orders
    const purchaseOrders = await purchasingService.listPurchaseOrders(filters, {
      take: Number(limit),
      skip: Number(offset),
      order: { created_at: "DESC" }
    })

    // Get total count for pagination
    const totalOrders = await purchasingService.listPurchaseOrders(filters)
    const count = totalOrders.length

    // Expand relations if requested
    let enrichedOrders = purchaseOrders
    
    if (expandStr.includes('supplier')) {
      const supplierIds = [...new Set(purchaseOrders.map(po => po.supplier_id))]
      const suppliers = await purchasingService.listSuppliers({ 
        id: supplierIds 
      })
      const supplierMap = suppliers.reduce((acc, supplier) => {
        acc[supplier.id] = supplier
        return acc
      }, {} as Record<string, any>)

      enrichedOrders = purchaseOrders.map(po => ({
        ...po,
        supplier: supplierMap[po.supplier_id]
      }))
    }

    if (expandStr.includes('items')) {
      const orderIds = purchaseOrders.map(po => po.id)
      const items = await purchasingService.listPurchaseOrderItems({
        purchase_order_id: orderIds
      })
      
      const itemsMap = items.reduce((acc, item) => {
        if (!acc[item.purchase_order_id]) acc[item.purchase_order_id] = []
        acc[item.purchase_order_id].push(item)
        return acc
      }, {} as Record<string, any[]>)

      enrichedOrders = enrichedOrders.map(po => ({
        ...po,
        items: itemsMap[po.id] || [],
        items_count: itemsMap[po.id]?.length || 0
      }))
    }

    res.json({
      purchase_orders: enrichedOrders,
      count,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    res.status(500).json({
      error: 'Failed to fetch purchase orders',
      message: error.message
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { result } = await createPurchaseOrderWorkflow(req.scope).run({
      input: req.body as any, // TODO: Add proper type for CreatePurchaseOrderWorkflowInput
    })

    res.status(201).json({ purchase_order: result })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    res.status(500).json({
      error: 'Failed to create purchase order',
      message: error.message
    })
  }
} 