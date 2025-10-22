import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type PurchaseOrderItem = {
  product_sku?: string
  supplier_sku?: string
  product_title: string
  product_variant_title?: string
  quantity_ordered: number
  unit_cost: number
  line_total: number
}

type StepInput = {
  purchase_order: {
    po_number: string
    items: PurchaseOrderItem[]
    currency_code: string
  }
}

export const generatePurchaseOrderCsvStep = createStep(
  "generate-purchase-order-csv",
  async function ({ purchase_order }: StepInput, { container }) {
    const fileModuleService = container.resolve("file")

    // Generate CSV content
    const headers = ["SKU", "Supplier SKU", "Product Title", "Variant", "Quantity", "Unit Cost", "Line Total"]
    const rows = purchase_order.items.map(item => [
      item.product_sku || "",
      item.supplier_sku || "",
      item.product_title,
      item.product_variant_title || "",
      item.quantity_ordered.toString(),
      (item.unit_cost / 100).toFixed(2),
      (item.line_total / 100).toFixed(2),
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    // Create file using File Module
    const csvBuffer = Buffer.from(csvContent, "utf-8")
    const fileName = `po-${purchase_order.po_number}-${Date.now()}.csv`

    const uploadResult = await fileModuleService.upload({
      filename: fileName,
      content: csvBuffer,
      mimeType: "text/csv",
    })

    return new StepResponse({
      file_key: uploadResult.key,
      file_url: uploadResult.url,
      filename: fileName,
    })
  },
  async (uploadResult, { container }) => {
    if (!uploadResult) {
      return
    }

    const fileModuleService = container.resolve("file")

    // Clean up the file on rollback
    await fileModuleService.delete(uploadResult.file_key)
  }
)
