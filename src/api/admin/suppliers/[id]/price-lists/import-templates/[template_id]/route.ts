/**
 * Import Template API Routes (Get, Update, Delete)
 *
 * @see TEM-301 - Create Import Template Storage API
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../../modules/purchasing/service"
import { z } from "zod"

type TemplateParams = {
  id: string
  template_id: string
}

type UpdateImportTemplateBody = {
  name?: string
  description?: string
  file_type?: 'csv' | 'txt'
  parse_config?: any
  column_mapping?: Record<string, string>
}

// Validation schema for updates
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  file_type: z.enum(['csv', 'txt']).optional(),
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
  }).optional(),
  column_mapping: z.record(z.string(), z.string()).optional(),
})

/**
 * GET /admin/suppliers/:id/price-lists/import-templates/:template_id
 *
 * Get a single import template by ID
 */
export const GET = async (
  req: MedusaRequest<TemplateParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id, template_id } = req.params

  try {
    const template = await purchasingService.getImportTemplate(
      template_id,
      supplier_id
    )

    res.json({ template })
  } catch (error: any) {
    console.error('Error fetching import template:', error)

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Template not found',
        message: error.message,
      })
      return
    }

    res.status(500).json({
      error: 'Failed to fetch import template',
      message: error.message,
    })
  }
}

/**
 * PUT /admin/suppliers/:id/price-lists/import-templates/:template_id
 *
 * Update an import template
 */
export const PUT = async (
  req: MedusaRequest<TemplateParams, {}, UpdateImportTemplateBody>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id, template_id } = req.params

  try {
    // Validate request body
    const validatedData = updateTemplateSchema.parse(req.body)

    // Update template
    const template = await purchasingService.updateImportTemplate(
      template_id,
      supplier_id,
      validatedData
    )

    res.json({ template })
  } catch (error: any) {
    console.error('Error updating import template:', error)

    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Template not found',
        message: error.message,
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
      error: 'Failed to update import template',
      message: error.message,
    })
  }
}

/**
 * DELETE /admin/suppliers/:id/price-lists/import-templates/:template_id
 *
 * Delete an import template
 */
export const DELETE = async (
  req: MedusaRequest<TemplateParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplier_id, template_id } = req.params

  try {
    const result = await purchasingService.deleteImportTemplate(
      template_id,
      supplier_id
    )

    res.json(result)
  } catch (error: any) {
    console.error('Error deleting import template:', error)

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Template not found',
        message: error.message,
      })
      return
    }

    res.status(500).json({
      error: 'Failed to delete import template',
      message: error.message,
    })
  }
}
