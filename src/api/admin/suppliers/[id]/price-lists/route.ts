import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
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
  brand_id?: string
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
    variant_sku?: string
    cost_price: number
    quantity?: number
    notes?: string
  }>
}

// GET /admin/suppliers/:id/price-lists - Get active price list for supplier
export const GET = async (
  req: MedusaRequest<GetAdminSupplierPriceListsParams, GetAdminSupplierPriceListsQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService
  const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const { id: supplier_id } = req.params
  const { include_items = false, brand_id } = req.query

  try {
    // Get active price list for supplier
    const activePriceList = await purchasingService.getActivePriceListForSupplier(supplier_id)
    
    // If brand_id filter is provided but price list doesn't match, return empty
    if (brand_id && activePriceList && activePriceList.brand_id !== brand_id) {
      return res.json({
        price_list: null,
        items: [],
        items_count: 0
      })
    }
    
    if (!activePriceList) {
      return res.json({
        price_list: null,
        items: [],
        items_count: 0
      })
    }

    let enrichedPriceList = activePriceList
    let items = []
    
    // Get brand information if brand_id exists
    if (activePriceList.brand_id) {
      try {
        const brandQueryObj = remoteQueryObjectFromString({
          entryPoint: "brand",
          fields: ["id", "name", "code"],
          variables: {
            filters: { id: activePriceList.brand_id },
            limit: 1,
          },
        })
        const [brand] = await query(brandQueryObj)
        enrichedPriceList = { ...activePriceList, brand }
      } catch (brandError) {
        console.error('Error fetching brand for price list:', brandError)
        // Continue without brand info
      }
    }
    
    if (include_items) {
      // Get price list items
      const rawItems = await purchasingService.listSupplierPriceListItems({
        price_list_id: activePriceList.id
      })

      // Enrich items with product and variant data
      items = await Promise.all(rawItems.map(async (item) => {
        let product = null
        let variant = null

        // Only fetch for non-manual entries
        if (item.product_variant_id && !item.product_variant_id.startsWith('manual-')) {
          try {
            // Fetch variant data
            const variantQueryObj = remoteQueryObjectFromString({
              entryPoint: "variant",
              fields: ["id", "title", "sku"],
              variables: {
                filters: { id: item.product_variant_id },
                limit: 1,
              },
            })
            const [variantData] = await query(variantQueryObj)
            variant = variantData

            // Fetch product data
            if (item.product_id) {
              const productQueryObj = remoteQueryObjectFromString({
                entryPoint: "product",
                fields: ["id", "title"],
                variables: {
                  filters: { id: item.product_id },
                  limit: 1,
                },
              })
              const [productData] = await query(productQueryObj)
              product = productData
            }
          } catch (error) {
            console.error(`Error fetching product/variant for item ${item.id}:`, error)
          }
        }

        return {
          ...item,
          product,
          variant,
        }
      }))
    }

    const finalPriceList = {
      ...enrichedPriceList,
      items,
      items_count: items.length
    }

    res.json({
      price_list: finalPriceList,
      items: items,
      items_count: items.length
    })
  } catch (error) {
    console.error('Error fetching supplier price list:', error)
    res.status(500).json({
      error: 'Failed to fetch supplier price list',
      message: error.message
    })
  }
}

// POST /admin/suppliers/:id/price-lists - Create/import price list (replaces existing)
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
          items: req.body.items,
          overwrite_existing: true
        },
      })

    res.status(201).json({ 
      price_list: result.price_list,
      items: result.items,
      imported_count: result.items.length,
      overwritten: true
    })
  } catch (error) {
    console.error('Error creating/importing price list:', error)
    res.status(500).json({
      error: 'Failed to create/import price list',
      message: error.message
    })
  }
}