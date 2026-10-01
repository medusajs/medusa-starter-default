import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { completeCartPreorderWorkflow } from "../../../../../workflows/complete-cart-preorder"

// Errors the customer can recover from (retry payment), mirrors core /store/carts/:id/complete
const RECOVERABLE_ERROR_TYPES: string[] = [
  MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
  MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,
]

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params

  const { result, errors } = await completeCartPreorderWorkflow(req.scope).run({
    input: {
      cart_id: id,
    },
    throwOnError: false,
  })

  const error = errors?.[0]?.error as
    | { type?: string; message?: string }
    | undefined

  if (error) {
    if (error.type && RECOVERABLE_ERROR_TYPES.includes(error.type)) {
      res.status(200).json({
        type: "cart",
        cart: { id },
        error: error.message ?? "Payment could not be completed",
      })
      return
    }

    throw error
  }

  res.json({
    type: "order",
    order: result.order,
  })
}
