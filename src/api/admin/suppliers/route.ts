import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import PurchasingService from "../../../modules/purchasing/service"
import { createSupplierWorkflow } from "../../../modules/purchasing/workflows/create-supplier"

type GetAdminSuppliersQuery = {
  limit?: number
  offset?: number
  q?: string
  is_active?: boolean
  include_stats?: boolean
}

type PostAdminCreateSupplierType = {
  name: string
  code?: string
  email?: string
  phone?: string
  website?: string
  contact_person?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  currency_code?: string
  notes?: string
  metadata?: Record<string, any>
}

// GET /admin/suppliers - List suppliers
export const GET = async (
  req: MedusaRequest<GetAdminSuppliersQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { 
    limit = 20, 
    offset = 0, 
    q, 
    is_active, 
    include_stats = false 
  } = req.query

  const filters: any = {}
  
  if (q) {
    filters.name = { $ilike: `%${q}%` }
  }
  
  if (is_active !== undefined) {
    filters.is_active = is_active === 'true'
  }

  try {
    // Get suppliers
    const suppliers = await purchasingService.listSuppliers(filters, {
      take: Number(limit),
      skip: Number(offset),
      order: { created_at: "DESC" }
    })

    // Get total count for pagination
    const totalSuppliers = await purchasingService.listSuppliers(filters)
    const count = totalSuppliers.length

    // Add stats if requested
    let enrichedSuppliers = suppliers
    if (include_stats) {
      enrichedSuppliers = await Promise.all(
        suppliers.map(async (supplier) => {
          const purchaseOrders = await purchasingService.getPurchaseOrdersBySupplier(supplier.id)
          const supplierProducts = await purchasingService.listSupplierProducts({ 
            supplier_id: supplier.id 
          })
          
          return {
            ...supplier,
            purchase_orders_count: purchaseOrders.length,
            products_count: supplierProducts.length,
            last_order_date: purchaseOrders.length > 0 
              ? new Date(Math.max(...purchaseOrders.map(po => new Date(po.order_date).getTime())))
              : null
          }
        })
      )
    }

    res.json({
      suppliers: enrichedSuppliers,
      count,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    res.status(500).json({
      error: 'Failed to fetch suppliers',
      message: error.message
    })
  }
}

// POST /admin/suppliers - Create supplier
export const POST = async (
  req: MedusaRequest<PostAdminCreateSupplierType>,
  res: MedusaResponse
) => {
  try {
    const { result } = await createSupplierWorkflow(req.scope)
      .run({
        input: req.body,
      })

    res.status(201).json({ supplier: result })
  } catch (error) {
    console.error('Error creating supplier:', error)
    res.status(500).json({
      error: 'Failed to create supplier',
      message: error.message
    })
  }
} 