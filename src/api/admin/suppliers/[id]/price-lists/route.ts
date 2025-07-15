import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingService from "../../../../../modules/purchasing/service"
import { importPriceListWorkflow } from "../../../../../modules/purchasing/workflows/import-price-list"

type GetAdminSupplierPriceListsParams = {
  id: string
}

type GetAdminSupplierPriceListsQuery = {
  limit?: number
  offset?: number
  is_active?: boolean
  include_items?: boolean
}

type PostAdminCreatePriceListType = {
  name: string
  description?: string
  effective_date?: string
  expiry_date?: string
  currency_code?: string
  upload_filename?: string
  upload_metadata?: any
  items: Array<{
    product_variant_id: string
    product_id: string
    supplier_sku?: string
    variant_sku?: string
    cost_price: number
    quantity?: number
    lead_time_days?: number
    notes?: string
  }>
}

// GET /admin/suppliers/:id/price-lists - Get price lists for supplier
export const GET = async (
  req: MedusaRequest<GetAdminSupplierPriceListsParams, GetAdminSupplierPriceListsQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id } = req.params
  const { 
    limit = 20, 
    offset = 0, 
    is_active,
    include_items = false 
  } = req.query

  try {
    const filters: any = { supplier_id }
    
    if (is_active !== undefined) {
      filters.is_active = is_active === 'true'
    }

    const priceLists = await purchasingService.listSupplierPriceLists(filters, {
      take: Number(limit),
      skip: Number(offset),
      order: { created_at: "DESC" }
    })

    const totalCount = await purchasingService.listSupplierPriceLists(filters)
    
    // Include items if requested
    let enrichedPriceLists = priceLists
    if (include_items) {
      enrichedPriceLists = await Promise.all(
        priceLists.map(async (priceList) => {
          const items = await purchasingService.listSupplierPriceListItems({
            price_list_id: priceList.id
          })
          return {
            ...priceList,
            items,
            items_count: items.length
          }
        })
      )
    }

    res.json({
      price_lists: enrichedPriceLists,
      count: totalCount.length,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('Error fetching supplier price lists:', error)
    res.status(500).json({
      error: 'Failed to fetch supplier price lists',
      message: error.message
    })
  }
}

// POST /admin/suppliers/:id/price-lists - Create/import price list
export const POST = async (
  req: MedusaRequest<PostAdminCreatePriceListType>,
  res: MedusaResponse
) => {
  const { id: supplier_id } = req.params

  try {
    const { result } = await importPriceListWorkflow(req.scope)
      .run({
        input: {
          supplier_id,
          name: req.body.name,
          description: req.body.description,
          effective_date: req.body.effective_date ? new Date(req.body.effective_date) : undefined,
          expiry_date: req.body.expiry_date ? new Date(req.body.expiry_date) : undefined,
          currency_code: req.body.currency_code,
          upload_filename: req.body.upload_filename,
          upload_metadata: req.body.upload_metadata,
          items: req.body.items
        },
      })

    res.status(201).json({ 
      price_list: result.price_list,
      items: result.items,
      imported_count: result.items.length
    })
  } catch (error) {
    console.error('Error creating/importing price list:', error)
    res.status(500).json({
      error: 'Failed to create/import price list',
      message: error.message
    })
  }
}