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
      "variant_sku,product_id,cost_price,quantity,notes",
      "PROD-001-VAR,prod_01234567890123456789,25.50,1,Example product variant",
      "PROD-002-VAR,,15.75,5,Another example with quantity",
      ",,30.00,1,Example with notes only"
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