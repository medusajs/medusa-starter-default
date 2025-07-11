import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { createPurchaseOrderWorkflow } from "../../../modules/purchasing/workflows/create-purchase-order"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const workflowInput = req.body as any // Simplified for now, will be validated by the workflow

  const { result } = await createPurchaseOrderWorkflow(req.scope).run({
    input: workflowInput,
  })

  res.status(201).json({ purchase_order: result })
} 