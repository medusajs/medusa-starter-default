import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"

type ProcessPriceListItemsStepInput = {
  price_list_id: string
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

export const processPriceListItemsStep = createStep(
  "process-price-list-items-step",
  async (input: ProcessPriceListItemsStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Create price list items
    const processedItems = input.items.map(item => ({
      price_list_id: input.price_list_id,
      product_variant_id: item.product_variant_id,
      product_id: item.product_id,
      supplier_sku: item.supplier_sku ?? undefined,
      variant_sku: item.variant_sku ?? undefined,
      // Map legacy CSV field cost_price to model field net_price
      net_price: item.cost_price,
      quantity: item.quantity ?? 1,
      lead_time_days: item.lead_time_days ?? undefined,
      notes: item.notes ?? undefined,
      is_active: true
    }))

    const priceListItems = await purchasingService.createSupplierPriceListItems(processedItems)

    // Update or create supplier-product relationships
    const updatedSupplierProducts = []
    for (const item of priceListItems) {
      const supplierProduct = await purchasingService.upsertSupplierProductFromPriceList(item)
      updatedSupplierProducts.push(supplierProduct)
    }

    return new StepResponse(
      { items: priceListItems, supplier_products: updatedSupplierProducts },
      { priceListItems: priceListItems.map(item => item.id) }
    )
  },
  async (compensationInput, { container }) => {
    if (!compensationInput?.priceListItems?.length) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService
    
    await purchasingService.deleteSupplierPriceListItems(compensationInput.priceListItems)
  }
)