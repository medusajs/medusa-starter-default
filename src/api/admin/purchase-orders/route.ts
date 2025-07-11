import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import PurchaseOrderService from "../../../modules/purchasing/services/purchase-order.service"
import SupplierService from "../../../modules/purchasing/services/supplier.service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const purchaseOrderService = req.scope.resolve(
    `${PURCHASING_MODULE}.purchase-order`
  ) as PurchaseOrderService
  
  const supplierService = req.scope.resolve(
    `${PURCHASING_MODULE}.supplier`
  ) as SupplierService

  const { 
    limit = 20, 
    offset = 0, 
    status,
    priority,
    supplier_id,
    expand = ""
  } = req.query

  const filters: any = {}
  if (status) filters.status = status
  if (priority) filters.priority = priority
  if (supplier_id) filters.supplier_id = supplier_id

  const [purchaseOrders, count] = await Promise.all([
    purchaseOrderService.listPurchaseOrders(filters, {
      take: Number(limit),
      skip: Number(offset),
    }),
    purchaseOrderService.listPurchaseOrders(filters).then(pos => pos.length)
  ])

  // Expand relations if requested
  let enrichedOrders = purchaseOrders
  if (expand.includes('supplier')) {
    const supplierIds = [...new Set(purchaseOrders.map(po => po.supplier_id))]
    const suppliers = await supplierService.listSuppliers({ id: supplierIds })
    const supplierMap = suppliers.reduce((acc, supplier) => {
      acc[supplier.id] = supplier
      return acc
    }, {} as Record<string, any>)

    enrichedOrders = purchaseOrders.map(po => ({
      ...po,
      supplier: supplierMap[po.supplier_id]
    }))
  }

  if (expand.includes('items')) {
    const orderIds = purchaseOrders.map(po => po.id)
    const items = await purchaseOrderService.listPurchaseOrderItems({
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
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { createPurchaseOrderWorkflow } = await import(
    "../../../modules/purchasing/workflows/create-purchase-order"
  )

  const { result } = await createPurchaseOrderWorkflow(req.scope).run({
    input: req.body,
  })

  res.status(201).json({ purchase_order: result })
} 