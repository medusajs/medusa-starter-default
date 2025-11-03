import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"
import { PurchaseOrderStatus } from "../models/purchase-order.model"
import { MedusaError } from "@medusajs/framework/utils"

type ConfirmPurchaseOrderInput = {
  purchase_order_id: string
  confirmed_by?: string
  notes?: string
}

const confirmPurchaseOrderStep = createStep(
  "confirm-purchase-order-step",
  async (input: ConfirmPurchaseOrderInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { purchase_order_id, confirmed_by, notes } = input

    // Fetch the purchase order
    const purchaseOrder = await purchasingService.retrievePurchaseOrder(purchase_order_id)

    // Validate that the PO is in "sent" status
    if (purchaseOrder.status !== PurchaseOrderStatus.SENT) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot confirm purchase order with status "${purchaseOrder.status}". Purchase order must be in "sent" status.`
      )
    }

    // Store previous status for rollback
    const previousStatus = purchaseOrder.status

    // Update status to "confirmed"
    const [updatedPO] = await purchasingService.updatePurchaseOrders([
      {
        id: purchase_order_id,
        status: PurchaseOrderStatus.CONFIRMED,
        confirmed_by: confirmed_by || null,
        notes: notes ? `${purchaseOrder.notes || ''}\n[Confirmed] ${notes}`.trim() : purchaseOrder.notes,
        metadata: {
          ...purchaseOrder.metadata,
          confirmed_at: new Date().toISOString(),
        },
      },
    ])

    return new StepResponse(
      { purchaseOrder: updatedPO },
      {
        purchaseOrderId: purchase_order_id,
        previousStatus,
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.purchaseOrderId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Revert to previous status
    await purchasingService.updatePurchaseOrders([
      {
        id: compensationData.purchaseOrderId,
        status: compensationData.previousStatus,
      },
    ])
  }
)

export const confirmPurchaseOrderWorkflow = createWorkflow(
  "confirm-purchase-order-workflow",
  (input: ConfirmPurchaseOrderInput) => {
    const { purchaseOrder } = confirmPurchaseOrderStep(input)

    return new WorkflowResponse({ purchaseOrder })
  }
)
