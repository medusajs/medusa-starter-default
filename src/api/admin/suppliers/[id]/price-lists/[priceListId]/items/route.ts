import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../../modules/purchasing/service"

type GetAdminPriceListItemsParams = {
  id: string
  priceListId: string
}

type GetAdminPriceListItemsQuery = {
  limit?: number
  offset?: number
  product_id?: string
  product_variant_id?: string
  supplier_sku?: string
  is_active?: boolean
}

type PostAdminCreatePriceListItemType = {
  product_variant_id: string
  product_id: string
  supplier_sku?: string
  variant_sku?: string
  cost_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
}

type PutAdminUpdatePriceListItemType = {
  supplier_sku?: string
  variant_sku?: string
  cost_price?: number
  quantity?: number
  lead_time_days?: number
  notes?: string
  is_active?: boolean
}

// GET /admin/suppliers/:id/price-lists/:priceListId/items - Get price list items
export const GET = async (
  req: MedusaRequest<GetAdminPriceListItemsParams, GetAdminPriceListItemsQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { priceListId } = req.params
  const { 
    limit = 50, 
    offset = 0, 
    product_id,
    product_variant_id,
    supplier_sku,
    is_active 
  } = req.query

  try {
    const filters: any = { price_list_id: priceListId }
    
    if (product_id) {
      filters.product_id = product_id
    }
    
    if (product_variant_id) {
      filters.product_variant_id = product_variant_id
    }
    
    if (supplier_sku) {
      filters.supplier_sku = { $ilike: `%${supplier_sku}%` }
    }
    
    if (is_active !== undefined) {
      filters.is_active = is_active === 'true'
    }

    const items = await purchasingService.listSupplierPriceListItems(filters, {
      take: Number(limit),
      skip: Number(offset),
      order: { created_at: "DESC" }
    })

    const totalCount = await purchasingService.listSupplierPriceListItems(filters)

    res.json({
      items,
      count: totalCount.length,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('Error fetching price list items:', error)
    res.status(500).json({
      error: 'Failed to fetch price list items',
      message: error.message
    })
  }
}

// POST /admin/suppliers/:id/price-lists/:priceListId/items - Add item to price list
export const POST = async (
  req: MedusaRequest<PostAdminCreatePriceListItemType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { priceListId } = req.params

  try {
    const itemData = {
      price_list_id: priceListId,
      product_variant_id: req.body.product_variant_id,
      product_id: req.body.product_id,
      supplier_sku: req.body.supplier_sku,
      variant_sku: req.body.variant_sku,
      cost_price: req.body.cost_price,
      quantity: req.body.quantity || 1,
      lead_time_days: req.body.lead_time_days,
      notes: req.body.notes,
      is_active: true
    }

    const [item] = await purchasingService.createSupplierPriceListItems([itemData])

    // Update supplier-product relationship
    const supplierProduct = await purchasingService.upsertSupplierProductFromPriceList(item)

    res.status(201).json({ 
      item,
      supplier_product: supplierProduct
    })
  } catch (error) {
    console.error('Error creating price list item:', error)
    res.status(500).json({
      error: 'Failed to create price list item',
      message: error.message
    })
  }
}