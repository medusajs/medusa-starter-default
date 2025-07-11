import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { ModuleRegistrationName } from "@medusajs/utils"

type ValidateProductVariantsStepInput = {
  items: Array<{
    product_variant_id: string
    quantity_ordered: number
    unit_cost: number
  }>
}

export const validateProductVariantsStep = createStep(
  "validate-product-variants-step",
  async (input: ValidateProductVariantsStepInput, { container }) => {
    const productModule = container.resolve(ModuleRegistrationName.PRODUCT)

    const validatedItems = []
    
    for (const item of input.items) {
      const variant = await productModule.retrieveProductVariant(item.product_variant_id)
      
      if (!variant) {
        throw new Error(`Product variant ${item.product_variant_id} not found`)
      }

      validatedItems.push({
        ...item,
        product_title: variant.product?.title || "Unknown Product",
        product_variant_title: variant.title,
        product_sku: variant.sku,
        line_total: item.quantity_ordered * item.unit_cost
      })
    }

    return new StepResponse({ validatedItems })
  }
) 