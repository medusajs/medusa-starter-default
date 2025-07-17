import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../modules/purchasing/service"

type GetAdminSupplierPriceListHistoryParams = {
  id: string
}

type GetAdminSupplierPriceListHistoryQuery = {
  limit?: number
  offset?: number
}

// GET /admin/suppliers/:id/price-lists/history - Get price list history for supplier
export const GET = async (
  req: MedusaRequest<GetAdminSupplierPriceListHistoryParams, GetAdminSupplierPriceListHistoryQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id } = req.params
  const { limit = 20, offset = 0 } = req.query

  try {
    const history = await purchasingService.getPriceListHistory(supplier_id)
    
    // Paginate results
    const paginatedHistory = history.slice(Number(offset), Number(offset) + Number(limit))
    
    // Get item counts for each price list
    const enrichedHistory = await Promise.all(
      paginatedHistory.map(async (priceList) => {
        const items = await purchasingService.listSupplierPriceListItems({
          price_list_id: priceList.id
        })
        return {
          ...priceList,
          items_count: items.length
        }
      })
    )

    res.json({
      history: enrichedHistory,
      count: history.length,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    console.error('Error fetching price list history:', error)
    res.status(500).json({
      error: 'Failed to fetch price list history',
      message: error.message
    })
  }
}