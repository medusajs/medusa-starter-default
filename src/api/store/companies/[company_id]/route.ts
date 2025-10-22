import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { B2B_MODULE } from "@modules/b2b"
import type B2BModuleService from "@modules/b2b/service"

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  currency_code: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const { company_id: companyId } = req.params
  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  await b2bService.assertCompanyOwnership(companyId, customerId)

  const company = await b2bService.retrieveCompany(companyId, {
    relations: ["employees"],
  })

  res.json({ company })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const { company_id: companyId } = req.params
  const update = updateCompanySchema.parse(req.body ?? {})

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  await b2bService.assertCompanyOwnership(companyId, customerId)

  const company = await b2bService.updateCompany({
    id: companyId,
    ...update,
  })

  res.json({ company })
}
