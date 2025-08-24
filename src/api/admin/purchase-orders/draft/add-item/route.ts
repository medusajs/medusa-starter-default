import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addItemToDraftPurchaseOrderWorkflow } from "../../../../../modules/purchasing/workflows/add-item-to-draft-po"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const workflowInput = req.body as any // Input will be validated by the workflow

  const { result } = await addItemToDraftPurchaseOrderWorkflow(req.scope).run({
    input: workflowInput,
  })

  res.status(200).json({ item: result })
} 