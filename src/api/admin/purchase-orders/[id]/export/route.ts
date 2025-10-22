import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingModuleService from "../../../../../modules/purchasing/service"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { format = "csv" } = req.query
  const purchasingService: PurchasingModuleService = req.scope.resolve(PURCHASING_MODULE)

  // Fetch the purchase order with all relations
  const purchaseOrders = await purchasingService.listPurchaseOrders(
    { id: [id] },
    { relations: ["items"] }
  )

  const purchaseOrder = purchaseOrders[0]
  if (!purchaseOrder) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Purchase order with id ${id} not found`
    )
  }

  if (format === "json") {
    // Export as JSON
    const jsonData = JSON.stringify(purchaseOrder, null, 2)

    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", `attachment; filename="po-${purchaseOrder.po_number}.json"`)
    res.send(jsonData)
  } else {
    // Export as CSV
    const headers = ["SKU", "Supplier SKU", "Product Title", "Variant", "Quantity", "Unit Cost", "Line Total"]
    const rows = purchaseOrder.items.map((item: any) => [
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
      ...rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="po-${purchaseOrder.po_number}.csv"`)
    res.send(csvContent)
  }
}
