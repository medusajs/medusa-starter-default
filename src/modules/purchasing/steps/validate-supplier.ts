import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import SupplierService from "../services/supplier.service"

type ValidateSupplierStepInput = {
  supplier_id: string
}

export const validateSupplierStep = createStep(
  "validate-supplier-step",
  async (input: ValidateSupplierStepInput, { container }) => {
    const supplierService = container.resolve(
      `${PURCHASING_MODULE}.supplier`
    ) as SupplierService

    const supplier = await supplierService.retrieveSupplier(input.supplier_id)
    
    if (!supplier) {
      throw new Error(`Supplier with id ${input.supplier_id} not found`)
    }

    if (!supplier.is_active) {
      throw new Error(`Supplier ${supplier.name} is inactive`)
    }

    return new StepResponse({ supplier })
  }
) 