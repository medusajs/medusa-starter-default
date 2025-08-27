import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"

type ValidateSupplierStepInput = {
  supplier_id: string
}

export const validateSupplierStep = createStep(
  "validate-supplier-step",
  async (input: ValidateSupplierStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const supplier = await purchasingService.retrieveSupplier(input.supplier_id)
    
    if (!supplier) {
      throw new Error(`Supplier with id ${input.supplier_id} not found`)
    }

    if (!supplier.is_active) {
      throw new Error(`Supplier ${supplier.name} is inactive`)
    }

    return new StepResponse({ supplier })
  }
) 