import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { B2B_MODULE } from "../../../../modules/b2b"
import type B2BModuleService from "../../../../modules/b2b/service"

const createEmployeeSchema = z.object({
  customer_id: z.string().min(1),
  spending_limit: z.number().nonnegative(),
  is_admin: z.boolean(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const { company_id: companyId } = req.params
  const payload = createEmployeeSchema.parse(req.body ?? {})

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  const requester = await b2bService.assertCompanyOwnership(
    companyId,
    customerId
  )

  if (!requester.is_admin) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only company administrators can invite employees."
    )
  }

  const employee = await b2bService.createEmployee({
    ...payload,
    company_id: companyId,
  })

  res.status(200).json({ employee })
}
