import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const supplierId = req.params.id
    
    if (!supplierId) {
      res.status(400).json({
        type: "invalid_data",
        message: "Supplier ID is required",
      })
      return
    }

    // CSV template with headers and example data
    const csvTemplate = [
      "variant_sku,product_id,supplier_sku,cost_price,quantity,lead_time_days,notes",
      "PROD-001-VAR,prod_01234567890123456789,SUP-SKU-001,25.50,1,14,Example product variant",
      "PROD-002-VAR,,SUP-SKU-002,15.75,5,7,Another example with quantity",
      ",,SUP-SKU-003,30.00,1,21,Example with notes only"
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="price-list-template-supplier-${supplierId}.csv"`)
    res.status(200).send(csvTemplate)
  } catch (error) {
    console.error("Error generating CSV template:", error)
    
    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}