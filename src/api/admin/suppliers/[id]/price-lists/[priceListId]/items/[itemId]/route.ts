import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../../../modules/purchasing/service"

type GetAdminPriceListItemParams = {
  id: string
  priceListId: string
  itemId: string
}

type PutAdminUpdatePriceListItemType = {
  supplier_sku?: string
  variant_sku?: string
  gross_price?: number
  discount_amount?: number
  discount_percentage?: number
  net_price?: number
  quantity?: number
  lead_time_days?: number
  notes?: string
  is_active?: boolean
}

// GET /admin/suppliers/:id/price-lists/:priceListId/items/:itemId - Get specific price list item
export const GET = async (
  req: MedusaRequest<GetAdminPriceListItemParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { itemId } = req.params

  try {
    const item = await purchasingService.retrieveSupplierPriceListItem(itemId)

    res.json({ item })
  } catch (error) {
    console.error('Error fetching price list item:', error)
    res.status(500).json({
      error: 'Failed to fetch price list item',
      message: error.message
    })
  }
}

// PUT /admin/suppliers/:id/price-lists/:priceListId/items/:itemId - Update price list item
export const PUT = async (
  req: MedusaRequest<PutAdminUpdatePriceListItemType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { itemId } = req.params
  const updateData = req.body

  try {
    const [item] = await purchasingService.updateSupplierPriceListItems([{
      id: itemId,
      ...updateData,
    }])

    // Update supplier-product relationship if net_price or other relevant fields changed
    if (updateData.net_price || updateData.quantity || updateData.lead_time_days) {
      const supplierProduct = await purchasingService.upsertSupplierProductFromPriceList(item)
      res.json({ item, supplier_product: supplierProduct })
    } else {
      res.json({ item })
    }
  } catch (error) {
    console.error('Error updating price list item:', error)
    res.status(500).json({
      error: 'Failed to update price list item',
      message: error.message
    })
  }
}

// DELETE /admin/suppliers/:id/price-lists/:priceListId/items/:itemId - Delete price list item
export const DELETE = async (
  req: MedusaRequest<GetAdminPriceListItemParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { itemId } = req.params

  try {
    await purchasingService.deleteSupplierPriceListItems([itemId])

    res.json({ 
      id: itemId,
      object: "price_list_item",
      deleted: true 
    })
  } catch (error) {
    console.error('Error deleting price list item:', error)
    res.status(500).json({
      error: 'Failed to delete price list item',
      message: error.message
    })
  }
}