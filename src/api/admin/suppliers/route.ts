import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import { 
  SupplierDTO,
  PurchasingService 
} from "../../../modules/purchasing"
import { createSupplierWorkflow } from "../../../modules/purchasing/workflows/create-supplier"

type GetAdminSuppliersQuery = {
  limit?: number
  offset?: number
  q?: string
  is_active?: boolean
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

  const { limit = 20, offset = 0, q, is_active } = req.validatedQuery

  const filters: any = {}
  
  if (q) {
    filters.name = { $ilike: `%${q}%` }
  }
  
  if (is_active !== undefined) {
    filters.is_active = is_active
  }

  const [suppliers, count] = await purchasingService.listAndCountSuppliers(
    filters,
    {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" }
    }
  )

  res.json({
    suppliers,
    count,
    limit,
    offset,
  })
}

// POST /admin/suppliers - Create supplier
export const POST = async (
  req: MedusaRequest<PostAdminCreateSupplierType>,
  res: MedusaResponse
) => {
  const { result } = await createSupplierWorkflow(req.scope)
    .run({
      input: req.validatedBody,
    })

  res.json({ supplier: result })
} 