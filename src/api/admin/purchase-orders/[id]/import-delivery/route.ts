import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { importDeliveryNoteWorkflow } from "../../../../../modules/purchasing/workflows/import-delivery-note"

type PostAdminImportDeliveryType = {
  file_content: string
  delivery_number?: string
  delivery_date?: string
  received_by?: string
  notes?: string
  import_filename?: string
}

export const POST = async (
  req: MedusaRequest<PostAdminImportDeliveryType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const {
    file_content,
    delivery_number,
    delivery_date,
    received_by,
    notes,
    import_filename,
  } = req.validatedBody || {}

  const { result } = await importDeliveryNoteWorkflow(req.scope).run({
    input: {
      purchase_order_id: id,
      file_content,
      delivery_number,
      delivery_date: delivery_date ? new Date(delivery_date) : undefined,
      received_by,
      notes,
      import_filename,
    },
  })

  res.json({
    delivery: result.delivery,
    matched_items: result.matched_items,
    unmatched_items: result.unmatched_items,
    backorder_items: result.backorder_items,
    total_backorder_count: result.total_backorder_count,
    new_status: result.new_status,
  })
}
