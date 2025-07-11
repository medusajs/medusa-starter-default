import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import { 
  PurchaseOrderDTO,
  PurchasingService 
} from "../../../modules/purchasing"
import { createPurchaseOrderWorkflow } from "../../../modules/purchasing/workflows/create-purchase-order"

type GetAdminPurchaseOrdersQuery = {
  limit?: number
  offset?: number
  supplier_id?: string
  status?: string
  po_number?: string
}

type PostAdminCreatePurchaseOrderType = {
  supplier_id: string
  expected_delivery_date?: Date
  payment_terms?: string
  delivery_address?: any
  notes?: string
  items: {
    product_variant_id: string
    supplier_product_id?: string
    supplier_sku?: string
    product_title: string
    product_variant_title?: string
    quantity_ordered: number
    unit_cost: number
  }[]
}

// GET /admin/purchase-orders - List purchase orders
export const GET = async (
  req: MedusaRequest<GetAdminPurchaseOrdersQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { limit = 20, offset = 0, supplier_id, status, po_number } = req.validatedQuery

  const filters: any = {}
  
  if (supplier_id) {
    filters.supplier_id = supplier_id
  }
  
  if (status) {
    filters.status = status
  }

  if (po_number) {
    filters.po_number = { $ilike: `%${po_number}%` }
  }

  const [purchase_orders, count] = await purchasingService.listAndCountPurchaseOrders(
    filters,
    {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
      relations: ["items"]
    }
  )

  res.json({
    purchase_orders,
    count,
    limit,
    offset,
  })
}

// POST /admin/purchase-orders - Create purchase order
export const POST = async (
  req: MedusaRequest<PostAdminCreatePurchaseOrderType>,
  res: MedusaResponse
) => {
  const { result } = await createPurchaseOrderWorkflow(req.scope)
    .run({
      input: req.validatedBody,
    })

  res.json({ purchase_order: result })
} 