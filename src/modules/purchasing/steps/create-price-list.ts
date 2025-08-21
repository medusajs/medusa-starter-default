import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"

type CreatePriceListStepInput = {
  supplier_id: string
  brand_id?: string
  name: string
  description?: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  upload_filename?: string
  upload_metadata?: any
}

export const createPriceListStep = createStep(
  "create-price-list-step",
  async (input: CreatePriceListStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const priceList = await purchasingService.createSupplierPriceList(input)

    return new StepResponse({ price_list: priceList }, { priceListId: priceList.id })
  },
  async (compensationInput, { container }) => {
    if (!compensationInput?.priceListId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService
    
    await purchasingService.deleteSupplierPriceLists([compensationInput.priceListId])
  }
)