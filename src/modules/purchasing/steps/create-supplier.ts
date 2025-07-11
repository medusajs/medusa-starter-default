import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"

type CreateSupplierStepInput = {
  name: string
  code?: string
  email?: string
  phone?: string
  website?: string
  contact_person?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  currency_code?: string
  notes?: string
  metadata?: Record<string, any>
}

export const createSupplierStep = createStep(
  "create-supplier-step",
  async (input: CreateSupplierStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const [supplier] = await purchasingService.createSuppliers([{
      ...input,
      currency_code: input.currency_code || "USD",
      is_active: true,
    }])

    return new StepResponse({ supplier }, { supplierId: supplier.id })
  },
  async (compensationInput, { container }) => {
    if (!compensationInput?.supplierId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService
    
    await purchasingService.deleteSuppliers([compensationInput.supplierId])
  }
) 