import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  decorateCartTotals,
  createRawPropertiesFromBigNumber,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { B2B_MODULE } from "@modules/b2b"
import type B2BModuleService from "@modules/b2b/service"

const CART_FORBIDDEN_FIELDS = ["*company", "*approvals"]

const sanitizeFields = (fields: string[] | undefined) => {
  if (!fields?.length) {
    return undefined
  }

  return fields.filter((field) => {
    return !CART_FORBIDDEN_FIELDS.some((forbidden) =>
      field.startsWith(forbidden)
    )
  })
}

const parseFields = (raw?: unknown) => {
  if (typeof raw !== "string") {
    return undefined
  }

  return raw
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id: cartId } = req.params

  const rawFields = parseFields(req.query?.fields)
  const allowedFields = sanitizeFields(rawFields)

  const remoteQuery = req.scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  )

  const query = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id: cartId } },
    fields: allowedFields ?? [],
  })

  const [cart] = await remoteQuery(query)

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart ${cartId} was not found`
    )
  }

  const cartModule = req.scope.resolve(Modules.CART)
  const detailedCart = await cartModule.retrieveCart(cartId, {
    relations: [
      "items",
      "items.product",
      "items.variant",
      "promotions",
      "customer",
      "shipping_methods",
      "shipping_methods.tax_lines",
      "shipping_methods.adjustments",
    ],
  })

  const totals = decorateCartTotals(detailedCart)
  createRawPropertiesFromBigNumber(totals)

  const b2bService: B2BModuleService = req.scope.resolve(B2B_MODULE)

  let company: Awaited<ReturnType<B2BModuleService["retrieveCompany"]>> | null =
    null

  const companyId =
    detailedCart?.metadata && "company_id" in detailedCart.metadata
      ? detailedCart.metadata.company_id
      : null

  if (companyId) {
    try {
      const retrievedCompany = await b2bService.retrieveCompany(
        companyId as string
      )
      company = retrievedCompany ?? null
    } catch (e) {
      company = null
    }
  }

  const approvals = await b2bService.getCartApprovals(cartId)

  res.json({
    cart: {
      ...totals,
      company,
      approvals,
    },
  })
}
