import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadPriceListCsvWorkflow } from "../../../../../../modules/purchasing/workflows/upload-price-list-csv"
import { z } from "zod"

const importPriceListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  currency_code: z.string().default("USD"),
  brand_id: z.string().optional(),
  csv_content: z.string().min(1, "CSV content is required"),
  upload_filename: z.string().min(1, "Upload filename is required"),
})

export async function POST(
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

    const validatedData = importPriceListSchema.parse(req.body)
    
    // Parse dates if provided
    const effectiveDate = validatedData.effective_date 
      ? new Date(validatedData.effective_date) 
      : undefined
    const expiryDate = validatedData.expiry_date 
      ? new Date(validatedData.expiry_date) 
      : undefined

    // Run the upload workflow
    const { result } = await uploadPriceListCsvWorkflow(req.scope).run({
      input: {
        supplier_id: supplierId,
        name: validatedData.name,
        description: validatedData.description,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        currency_code: validatedData.currency_code,
        brand_id: validatedData.brand_id,
        csv_content: validatedData.csv_content,
        upload_filename: validatedData.upload_filename,
      },
    })

    res.status(200).json({
      price_list: result.price_list,
      import_summary: result.import_summary,
      message: `Price list imported successfully. ${result.import_summary.success_count} items processed.`,
    })
  } catch (error) {
    console.error("Error importing price list:", error)
    
    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}