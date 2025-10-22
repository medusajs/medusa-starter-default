import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { B2B_MODULE } from "../../../../modules/b2b"
import type B2BModuleService from "../../../../modules/b2b/service"

const toggleSchema = z.object({
  requires_admin_approval: z.boolean(),
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
  const { requires_admin_approval } = toggleSchema.parse(req.body ?? {})

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)
  const requester = await b2bService.assertCompanyOwnership(
    companyId,
    customerId
  )

  if (!requester.is_admin) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only administrators can update approval settings."
    )
  }

  await b2bService.updateCompany({
    id: companyId,
    approval_settings: { requires_admin_approval },
  })

  res.status(204).send()
}
