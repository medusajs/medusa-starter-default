import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { B2B_MODULE } from "../../../../../modules/b2b"
import type B2BModuleService from "../../../../../modules/b2b/service"

const approvalSchema = z
  .object({
    metadata: z.record(z.unknown()).optional().nullable(),
  })
  .optional()

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const { cart_id: cartId } = req.params
  const { metadata } = approvalSchema.parse(req.body) ?? {}

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  const approval = await b2bService.requestCartApproval({
    cart_id: cartId,
    requested_by: customerId,
    metadata: metadata ?? null,
  })

  res.status(200).json({ approval })
}
