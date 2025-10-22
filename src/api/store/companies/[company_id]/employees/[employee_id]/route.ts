import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { B2B_MODULE } from "@modules/b2b"
import type B2BModuleService from "@modules/b2b/service"

const updateEmployeeSchema = z.object({
  spending_limit: z.number().nonnegative().optional(),
  is_admin: z.boolean().optional(),
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

  const { company_id: companyId, employee_id: employeeId } = req.params
  const payload = updateEmployeeSchema.parse(req.body ?? {})

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)
  const requester = await b2bService.assertCompanyOwnership(
    companyId,
    customerId
  )

  if (!requester.is_admin) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only company administrators can update employees."
    )
  }

  const employee = await b2bService.updateEmployee({
    id: employeeId,
    company_id: companyId,
    ...payload,
  })

  res.json({ employee })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const { company_id: companyId, employee_id: employeeId } = req.params
  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)
  const requester = await b2bService.assertCompanyOwnership(
    companyId,
    customerId
  )

  if (!requester.is_admin && requester.id !== employeeId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only administrators can remove other employees."
    )
  }

  await b2bService.deleteEmployee(employeeId)

  res.status(204).send()
}
