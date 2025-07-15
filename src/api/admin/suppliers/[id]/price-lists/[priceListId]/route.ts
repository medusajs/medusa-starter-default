import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../modules/purchasing/service"

type GetAdminSupplierPriceListParams = {
  id: string
  priceListId: string
}

type GetAdminSupplierPriceListQuery = {
  include_items?: boolean
}

type PutAdminUpdatePriceListType = {
  name?: string
  description?: string
  effective_date?: string
  expiry_date?: string
  currency_code?: string
  is_active?: boolean
  upload_filename?: string
  upload_metadata?: any
}

// GET /admin/suppliers/:id/price-lists/:priceListId - Get specific price list
export const GET = async (
  req: MedusaRequest<GetAdminSupplierPriceListParams, GetAdminSupplierPriceListQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { priceListId } = req.params
  const { include_items = false } = req.query

  try {
    const priceList = await purchasingService.retrieveSupplierPriceList(priceListId)

    let enrichedPriceList = priceList
    if (include_items) {
      const items = await purchasingService.listSupplierPriceListItems({
        price_list_id: priceListId
      })
      enrichedPriceList = {
        ...priceList,
        items,
        items_count: items.length
      }
    }

    res.json({ price_list: enrichedPriceList })
  } catch (error) {
    console.error('Error fetching price list:', error)
    res.status(500).json({
      error: 'Failed to fetch price list',
      message: error.message
    })
  }
}

// PUT /admin/suppliers/:id/price-lists/:priceListId - Update price list
export const PUT = async (
  req: MedusaRequest<PutAdminUpdatePriceListType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { priceListId } = req.params
  const updateData = req.body

  try {
    const processedData = {
      ...updateData,
      effective_date: updateData.effective_date ? new Date(updateData.effective_date) : undefined,
      expiry_date: updateData.expiry_date ? new Date(updateData.expiry_date) : undefined,
    }

    const [priceList] = await purchasingService.updateSupplierPriceLists([{
      id: priceListId,
      ...processedData,
    }])

    res.json({ price_list: priceList })
  } catch (error) {
    console.error('Error updating price list:', error)
    res.status(500).json({
      error: 'Failed to update price list',
      message: error.message
    })
  }
}

// DELETE /admin/suppliers/:id/price-lists/:priceListId - Delete price list
export const DELETE = async (
  req: MedusaRequest<GetAdminSupplierPriceListParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { priceListId } = req.params

  try {
    await purchasingService.deleteSupplierPriceLists([priceListId])

    res.json({ 
      id: priceListId,
      object: "price_list",
      deleted: true 
    })
  } catch (error) {
    console.error('Error deleting price list:', error)
    res.status(500).json({
      error: 'Failed to delete price list',
      message: error.message
    })
  }
}