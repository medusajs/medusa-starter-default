import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { OFFER_MODULE } from "../../modules/offers"

export type DeleteOfferInput = {
  offer_id: string
}

/**
 * Step to validate offer can be deleted
 * Only DRAFT offers can be deleted
 */
const validateOfferDeletableStep = createStep(
  "validate-offer-deletable",
  async (offer_id: string, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)
    const offer = await offerService.retrieveOffer(offer_id)

    if (!offer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Offer with id ${offer_id} not found`
      )
    }

    // Only draft offers can be deleted
    if (offer.status !== 'draft') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot delete offer with status "${offer.status}". Only draft offers can be deleted.`
      )
    }

    return new StepResponse({ offer })
  }
)

/**
 * Step to delete offer and all related data
 * Deletes line items, status history, and the offer itself
 */
const deleteOfferStep = createStep(
  "delete-offer",
  async (offer_id: string, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Get offer data for compensation
    const offer = await offerService.retrieveOffer(offer_id, {
      relations: ["line_items", "status_history"]
    })

    // Delete line items
    const lineItemIds = offer.line_items.map((item: any) => item.id)
    if (lineItemIds.length > 0) {
      await offerService.deleteOfferLineItems(lineItemIds)
    }

    // Delete status history
    const statusHistoryIds = offer.status_history.map((history: any) => history.id)
    if (statusHistoryIds.length > 0) {
      await offerService.deleteOfferStatusHistories(statusHistoryIds)
    }

    // Delete offer
    await offerService.deleteOffers(offer_id)

    return new StepResponse(
      { deleted: true, offer_id },
      {
        offer,
        line_items: offer.line_items,
        status_history: offer.status_history,
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Restore offer
    await offerService.createOffers({
      id: compensationData.offer.id,
      offer_number: compensationData.offer.offer_number,
      customer_id: compensationData.offer.customer_id,
      customer_email: compensationData.offer.customer_email,
      customer_phone: compensationData.offer.customer_phone,
      status: compensationData.offer.status,
      offer_date: compensationData.offer.offer_date,
      valid_until: compensationData.offer.valid_until,
      sent_date: compensationData.offer.sent_date,
      accepted_date: compensationData.offer.accepted_date,
      rejected_date: compensationData.offer.rejected_date,
      converted_date: compensationData.offer.converted_date,
      subtotal: compensationData.offer.subtotal,
      tax_amount: compensationData.offer.tax_amount,
      discount_amount: compensationData.offer.discount_amount,
      total_amount: compensationData.offer.total_amount,
      currency_code: compensationData.offer.currency_code,
      billing_address: compensationData.offer.billing_address,
      shipping_address: compensationData.offer.shipping_address,
      notes: compensationData.offer.notes,
      internal_notes: compensationData.offer.internal_notes,
      terms_and_conditions: compensationData.offer.terms_and_conditions,
      pdf_file_id: compensationData.offer.pdf_file_id,
      converted_order_id: compensationData.offer.converted_order_id,
      created_by: compensationData.offer.created_by,
      metadata: compensationData.offer.metadata,
    })

    // Restore line items
    if (compensationData.line_items.length > 0) {
      await offerService.createOfferLineItems(
        compensationData.line_items.map((item: any) => ({
          id: item.id,
          offer_id: item.offer_id,
          item_type: item.item_type,
          product_id: item.product_id,
          variant_id: item.variant_id,
          title: item.title,
          description: item.description,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          discount_amount: item.discount_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          notes: item.notes,
          metadata: item.metadata,
        }))
      )
    }

    // Restore status history
    if (compensationData.status_history.length > 0) {
      await offerService.createOfferStatusHistories(
        compensationData.status_history.map((history: any) => ({
          id: history.id,
          offer_id: history.offer_id,
          from_status: history.from_status,
          to_status: history.to_status,
          changed_by: history.changed_by,
          changed_at: history.changed_at,
          reason: history.reason,
        }))
      )
    }
  }
)

/**
 * Workflow to delete an offer
 * Validates offer is deletable (DRAFT only), then deletes all related data
 */
export const deleteOfferWorkflow = createWorkflow(
  "delete-offer",
  (input: DeleteOfferInput) => {
    // Validate offer can be deleted (DRAFT status only)
    validateOfferDeletableStep(input.offer_id)

    // Delete offer and all related data
    const result = deleteOfferStep(input.offer_id)

    return new WorkflowResponse(result)
  }
)
