import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/core-flows"
import { B2B_MODULE } from "../../../../modules/b2b"
import type B2BModuleService from "../../../../modules/b2b/service"

const CUSTOMER_FORBIDDEN_FIELDS = ["*employee", "*employees"]

const sanitizeFields = (fields?: string[]) => {
  if (!fields?.length) {
    return undefined
  }

  return fields.filter((field) => {
    return !CUSTOMER_FORBIDDEN_FIELDS.some((forbidden) =>
      field.startsWith(forbidden)
    )
  })
}

async function attachEmployee(
  customerId: string,
  scope: MedusaRequest["scope"]
) {
  const b2bService: B2BModuleService = scope.resolve(B2B_MODULE)
  const [employee] = await b2bService.listEmployees(
    { customer_id: customerId },
    { relations: ["company"] }
  )

  return employee ?? null
}

const fetchCustomer = async (
  scope: MedusaRequest["scope"],
  customerId: string,
  fields?: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: { id: customerId },
    },
    fields: fields?.length ? fields : ["id", "email", "first_name", "last_name"],
  })

  const [customer] = await remoteQuery(query)
  return customer ?? null
}

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const sanitizedFields = sanitizeFields(req.queryConfig?.fields)
  const customer = await fetchCustomer(req.scope, customerId, sanitizedFields)

  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id: ${customerId} was not found`
    )
  }

  const employee = await attachEmployee(customerId, req.scope)

  res.json({
    customer: {
      ...customer,
      employee,
    },
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: req.validatedBody as any,
    },
  })

  const sanitizedFields = sanitizeFields(req.queryConfig?.fields)
  const customer = await fetchCustomer(req.scope, customerId, sanitizedFields)

  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id: ${customerId} was not found`
    )
  }

  const employee = await attachEmployee(customerId, req.scope)

  res.status(200).json({
    customer: {
      ...customer,
      employee,
    },
  })
}
