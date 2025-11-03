import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"

type ParseDeliveryNoteInput = {
  purchase_order_id: string
  file_content: string
  delivery_number?: string
}

type ParsedDeliveryItem = {
  sku: string // Could be product_sku or supplier_sku
  quantity_delivered: number
  notes?: string
}

type ParseDeliveryNoteOutput = {
  matched_items: Array<{
    purchase_order_item_id: string
    product_title: string
    sku: string
    quantity_delivered: number
    notes?: string
  }>
  unmatched_items: Array<{
    sku: string
    quantity_delivered: number
    reason: string
  }>
}

export const parseDeliveryNoteStep = createStep(
  "parse-delivery-note-step",
  async (input: ParseDeliveryNoteInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { purchase_order_id, file_content } = input

    // Fetch purchase order with items
    const purchaseOrder = await purchasingService.retrievePurchaseOrder(
      purchase_order_id,
      { relations: ["items"] }
    ) as any

    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      throw new Error("Purchase order has no items")
    }

    // Parse CSV content
    const parsedItems = parseCsvContent(file_content)

    // Create a map of PO items by SKU (both product_sku and supplier_sku)
    const poItemsMap = new Map<string, any>()
    purchaseOrder.items.forEach((item: any) => {
      if (item.product_sku) {
        poItemsMap.set(item.product_sku.toLowerCase().trim(), item)
      }
      if (item.supplier_sku) {
        poItemsMap.set(item.supplier_sku.toLowerCase().trim(), item)
      }
    })

    // Match delivered items to PO items
    const matchedItems: ParseDeliveryNoteOutput["matched_items"] = []
    const unmatchedItems: ParseDeliveryNoteOutput["unmatched_items"] = []

    for (const parsedItem of parsedItems) {
      const normalizedSku = parsedItem.sku.toLowerCase().trim()
      const poItem = poItemsMap.get(normalizedSku)

      if (poItem) {
        matchedItems.push({
          purchase_order_item_id: poItem.id,
          product_title: poItem.product_title,
          sku: parsedItem.sku,
          quantity_delivered: parsedItem.quantity_delivered,
          notes: parsedItem.notes,
        })
      } else {
        unmatchedItems.push({
          sku: parsedItem.sku,
          quantity_delivered: parsedItem.quantity_delivered,
          reason: "SKU not found in purchase order",
        })
      }
    }

    return new StepResponse({
      matched_items: matchedItems,
      unmatched_items: unmatchedItems,
    })
  }
)

/**
 * Parse CSV content into delivery items
 * Expected format: SKU,Quantity[,Notes]
 */
function parseCsvContent(content: string): ParsedDeliveryItem[] {
  const lines = content.trim().split("\n")
  const items: ParsedDeliveryItem[] = []

  // Skip header row if present
  const startIndex = lines[0].toLowerCase().includes("sku") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split by comma, handling quoted values
    const parts = line.split(",").map((part) => part.replace(/^"|"$/g, "").trim())

    if (parts.length < 2) {
      console.warn(`Skipping invalid line ${i + 1}: ${line}`)
      continue
    }

    const sku = parts[0]
    const quantityStr = parts[1]
    const notes = parts[2] || undefined

    // Parse quantity
    const quantity = parseInt(quantityStr, 10)
    if (isNaN(quantity) || quantity <= 0) {
      console.warn(`Skipping line ${i + 1} with invalid quantity: ${quantityStr}`)
      continue
    }

    items.push({
      sku,
      quantity_delivered: quantity,
      notes,
    })
  }

  return items
}
