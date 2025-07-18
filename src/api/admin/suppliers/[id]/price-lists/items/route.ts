import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/utils"
import { PURCHASING_MODULE } from "../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../modules/purchasing/service"

type GetAdminSupplierPriceListItemsParams = {
  id: string
}

type PostAdminCreatePriceListItemType = {
  product_variant_id: string
  product_id: string
  supplier_sku?: string
  variant_sku?: string
  gross_price?: number
  discount_amount?: number
  discount_percentage?: number
  net_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
}

type PutAdminUpdatePriceListItemType = {
  supplier_sku?: string
  variant_sku?: string
  gross_price?: number
  discount_amount?: number
  discount_percentage?: number
  net_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
}

// GET /admin/suppliers/:id/price-lists/items - Get price list items for supplier
export const GET = async (
  req: MedusaRequest<GetAdminSupplierPriceListItemsParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id } = req.params

  try {
    const activePriceList = await purchasingService.getActivePriceListForSupplier(supplier_id)
    
    if (!activePriceList) {
      return res.json({
        items: [],
        count: 0
      })
    }

    const items = await purchasingService.listSupplierPriceListItems({
      price_list_id: activePriceList.id
    })

    res.json({
      items,
      count: items.length,
      price_list: activePriceList
    })
  } catch (error) {
    console.error('Error fetching price list items:', error)
    res.status(500).json({
      error: 'Failed to fetch price list items',
      message: error.message
    })
  }
}

// POST /admin/suppliers/:id/price-lists/items - Add/update item in price list
export const POST = async (
  req: MedusaRequest<PostAdminCreatePriceListItemType>,
  res: MedusaResponse
) => {
  const { id: supplier_id } = req.params
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  try {
    // Get or create active price list for supplier
    let activePriceList = await purchasingService.getActivePriceListForSupplier(supplier_id)
    
    if (!activePriceList) {
      // Create a default price list
      activePriceList = await purchasingService.createSupplierPriceList({
        supplier_id,
        name: "Default Price List",
        description: "Automatically created price list",
        is_active: true,
        currency_code: "USD"
      })
    }

    // Validate that the product variant exists by checking with the product module
    const productModule = req.scope.resolve(ModuleRegistrationName.PRODUCT)
    try {
      await productModule.retrieveProductVariant(req.body.product_variant_id)
    } catch (variantError) {
      return res.status(400).json({
        error: 'Invalid product variant',
        message: `Product variant ${req.body.product_variant_id} not found`
      })
    }

    const result = await purchasingService.upsertPriceListItem(supplier_id, req.body)

    res.status(201).json({
      item: result[0],
      price_list: activePriceList
    })
  } catch (error) {
    console.error('Error adding/updating price list item:', error)
    res.status(500).json({
      error: 'Failed to add/update price list item',
      message: error.message
    })
  }
}