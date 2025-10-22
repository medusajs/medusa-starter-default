import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { B2B_MODULE } from "@modules/b2b"
import type B2BModuleService from "@modules/b2b/service"

const createCompanySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  currency_code: z.string().min(1),
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

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  const employees = await b2bService.listEmployees(
    { customer_id: customerId },
    {}
  )

  const uniqueCompanyIds = Array.from(
    new Set(employees.map((employee) => employee.company_id))
  )

  const companies = uniqueCompanyIds.length
    ? await b2bService.listCompanies(
        { id: uniqueCompanyIds },
        {
          relations: ["employees"],
        }
      )
    : []

  res.json({
    companies,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const body = createCompanySchema.parse(req.body ?? {})

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  const company = await b2bService.createCompany(body)

  res.status(200).json({
    companies: [company],
  })
}
