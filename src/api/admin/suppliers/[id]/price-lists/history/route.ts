import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../modules/purchasing/service"

type GetAdminSupplierPriceListHistoryParams = {
  id: string
}

type GetAdminSupplierPriceListHistoryQuery = {
  limit?: number
  offset?: number
  brand_id?: string
}

// GET /admin/suppliers/:id/price-lists/history - Get price list history for supplier
export const GET = async (
  req: MedusaRequest<GetAdminSupplierPriceListHistoryParams, GetAdminSupplierPriceListHistoryQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService
  const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const { id: supplier_id } = req.params
  const { limit = 20, offset = 0, brand_id } = req.query

  try {
    // Use database-level pagination
    const config = {
      skip: Number(offset),
      take: Number(limit)
    }

    const [history, count] = await purchasingService.getPriceListHistoryAndCount(
      supplier_id,
      brand_id,
      config
    )

    // Get item counts and brand information for each price list
    const enrichedHistory = await Promise.all(
      history.map(async (priceList) => {
        const items = await purchasingService.listSupplierPriceListItems({
          price_list_id: priceList.id
        })
        
        let enrichedPriceList = { ...priceList, items_count: items.length }
        
        // Get brand information if brand_id exists
        if (priceList.brand_id) {
          try {
            const brandQueryObj = remoteQueryObjectFromString({
              entryPoint: "brand",
              fields: ["id", "name", "code"],
              variables: {
                filters: { id: priceList.brand_id },
                limit: 1,
              },
            })
            const [brand] = await query(brandQueryObj)
            enrichedPriceList = { ...enrichedPriceList, brand }
          } catch (brandError) {
            console.error('Error fetching brand for price list:', brandError)
            // Continue without brand info
          }
        }
        
        return enrichedPriceList
      })
    )

    res.json({
      history: enrichedHistory,
      count,
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