import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import PurchasingService from "../../../modules/purchasing/services/purchasing.service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const purchasingService = req.scope.resolve(PURCHASING_MODULE) as PurchasingService

  const [suppliers, count] = await purchasingService.listAndCountSuppliers(
    req.filterableFields,
    req.listConfig
  )

  res.status(200).json({
    suppliers,
    count,
    offset: req.listConfig.skip,
    limit: req.listConfig.take,
  })
}

type AdminCreateSupplierPayload = {
  name: string
  email?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const purchasingService = req.scope.resolve(PURCHASING_MODULE) as PurchasingService

  const { name, email } = req.body as AdminCreateSupplierPayload

  if (!name) {
    return res.status(400).json({ message: "Name is required" })
  }

  const [supplier] = await purchasingService.createSuppliers([
    { name, email },
  ])

  res.status(201).json({ supplier })
} 