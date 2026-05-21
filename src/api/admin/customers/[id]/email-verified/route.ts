import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { setCustomerEmailVerifiedWorkflow } from "../../../../../workflows/set-customer-email-verified"

export const AdminSetEmailVerifiedSchema = z.object({
  verified: z.boolean(),
})

export type AdminSetEmailVerifiedSchema = z.infer<
  typeof AdminSetEmailVerifiedSchema
>

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminSetEmailVerifiedSchema>,
  res: MedusaResponse,
) => {
  const customerId = req.params.id

  const { result } = await setCustomerEmailVerifiedWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      verified: req.validatedBody.verified,
    },
  })

  res.json({
    customer_id: customerId,
    verified: result.verified,
  })
}
