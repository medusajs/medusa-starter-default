/**
 * Import Templates API Routes (List & Create)
 *
 * @see TEM-301 - Create Import Template Storage API
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../modules/purchasing/service"
import { z } from "zod"

type GetImportTemplatesParams = {
  id: string
}

type GetImportTemplatesQuery = {
  file_type?: 'csv' | 'txt'
}

type CreateImportTemplateBody = {
  name: string
  description?: string
  file_type: 'csv' | 'txt'
  parse_config: any
  column_mapping: Record<string, string>
}

// Validation schema
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional(),
  file_type: z.enum(['csv', 'txt']),
  parse_config: z.object({
    delimiter: z.string().length(1).optional(),
    quote_char: z.string().length(1).optional(),
    has_header: z.boolean().optional(),
    skip_rows: z.number().min(0).optional(),
    fixed_width_columns: z.array(z.object({
      name: z.string(),
      start: z.number().min(0),
      width: z.number().min(1),
    })).optional(),
  }),
  column_mapping: z.record(z.string(), z.string()).refine(
    (mapping) => {
      const values = Object.values(mapping)
      return values.includes('variant_sku') ||
             values.includes('product_id')
    },
    { message: 'Column mapping must include at least one of: variant_sku or product_id' }
  ),
})

/**
 * GET /admin/suppliers/:id/price-lists/import-templates
 *
 * List all import templates for a supplier
 */
export const GET = async (
  req: MedusaRequest<GetImportTemplatesParams, GetImportTemplatesQuery>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id } = req.params
  const { file_type } = req.query

  try {
    const templates = await purchasingService.listImportTemplates(
      supplier_id,
      { file_type }
    )

    res.json({
      templates,
      count: templates.length,
    })
  } catch (error: any) {
    console.error('Error listing import templates:', error)
    res.status(500).json({
      error: 'Failed to list import templates',
      message: error.message,
    })
  }
}

/**
 * POST /admin/suppliers/:id/price-lists/import-templates
 *
 * Create a new import template
 */
export const POST = async (
  req: MedusaRequest<GetImportTemplatesParams, {}, CreateImportTemplateBody>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id } = req.params

  try {
    // Validate request body
    const validatedData = createTemplateSchema.parse(req.body)

    // Create template
    const template = await purchasingService.createImportTemplate({
      supplier_id,
      ...validatedData,
    })

    res.status(201).json({ template })
  } catch (error: any) {
    console.error('Error creating import template:', error)

    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    if (error.message.includes('already exists')) {
      res.status(409).json({
        type: "conflict",
        message: error.message,
      })
      return
    }

    res.status(500).json({
      error: 'Failed to create import template',
      message: error.message,
    })
  }
}
