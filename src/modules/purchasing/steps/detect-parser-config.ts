/**
 * Parser Config Detection Workflow Step
 *
 * Resolves the appropriate parser configuration from:
 * 1. Supplier metadata (explicit configuration)
 * 2. Template reference in supplier metadata
 * 3. Auto-detection from file content and name
 * 4. Default fallback templates
 *
 * @see TEM-158 - Create Parser Config Detection Step
 */

import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { ParserConfig, ParserType } from "../types/parser-types"
import { PARSER_TEMPLATES } from "../config/parser-templates"

type DetectParserConfigStepInput = {
  supplier_id: string
  file_name: string
  file_content: string
}

/**
 * Check if content appears to be fixed-width format
 */
function isFixedWidthFormat(content: string): boolean {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return false

  // Check if lines have consistent length and structure
  const lineLengths = lines.slice(0, 10).map(line => line.length) // Check first 10 lines
  const avgLength = lineLengths.reduce((sum, len) => sum + len, 0) / lineLengths.length

  // If lines are consistently long and similar length, likely fixed-width
  const isConsistent = lineLengths.every(len => Math.abs(len - avgLength) < 10)
  const isLong = avgLength > 50

  return isConsistent && isLong
}

/**
 * Check if content appears to be Caterpillar format
 */
function isCaterpillarFormat(content: string): boolean {
  const lines = content.split('\n').filter(line => line.trim())

  // Check for Caterpillar-specific patterns:
  // - Lines start with part numbers (10-18 digits)
  // - Lines are consistently long (>100 chars)
  // - Contains specific markers
  return lines.some(line =>
    line.match(/^\d{10,18}/) && // Starts with 10-18 digit part number
    line.length > 100 // Long lines
  )
}

/**
 * Select the best template based on file characteristics
 */
function selectBestTemplate(fileName: string, fileContent: string, detectedType: ParserType): string {
  if (detectedType === 'csv') {
    // Check for semicolon delimiter
    const firstLine = fileContent.split('\n')[0]
    if (firstLine.includes(';') && !firstLine.includes(',')) {
      return 'semicolon-csv'
    }

    return 'generic-csv'
  }

  if (detectedType === 'fixed-width') {
    // Check for Caterpillar-specific patterns
    if (isCaterpillarFormat(fileContent)) {
      return 'caterpillar-fixed-width'
    }

    // Default fixed-width template
    return 'caterpillar-fixed-width'
  }

  return 'generic-csv'
}

/**
 * Parser configuration detection workflow step
 */
export const detectParserConfigStep = createStep(
  "detect-parser-config-step",
  async (input: DetectParserConfigStepInput, { container }): Promise<ParserConfig> => {
    const purchasingService = container.resolve("purchasingService")

    try {
      // Step 1: Check supplier metadata for explicit config
      const supplierConfig = await purchasingService.getSupplierParserConfig(input.supplier_id)

      if (supplierConfig) {
        // Validate the config before returning
        const validation = await purchasingService.validateParserConfig(supplierConfig)
        if (validation.valid) {
          return new StepResponse(supplierConfig)
        } else {
          // Log warning but continue with fallback
          console.warn(`Invalid supplier parser config for ${input.supplier_id}: ${validation.errors.join(', ')}`)
        }
      }

      // Step 2: Check if template is referenced in supplier metadata
      const supplier = await purchasingService.retrieveSupplier(input.supplier_id)
      const templateName = supplier?.metadata?.price_list_parser?.template_name

      if (templateName && typeof templateName === 'string') {
        const template = await purchasingService.getParserTemplate(templateName)
        if (template) {
          return new StepResponse(template)
        } else {
          console.warn(`Template ${templateName} not found for supplier ${input.supplier_id}`)
        }
      }

      // Step 3: Auto-detect from file content and name
      const detectedType = await purchasingService.detectParserFromContent(
        input.file_content,
        input.file_name
      )

      // Step 4: Select best template for detected type
      const bestTemplateName = selectBestTemplate(input.file_name, input.file_content, detectedType)
      const selectedTemplate = PARSER_TEMPLATES[bestTemplateName]

      const autoDetectedConfig: ParserConfig = {
        type: detectedType,
        template_name: bestTemplateName,
        config: selectedTemplate.config
      }

      return new StepResponse(autoDetectedConfig)

    } catch (error: any) {
      // Fallback to generic CSV if all else fails
      console.error(`Error detecting parser config for supplier ${input.supplier_id}:`, error)

      const fallbackConfig: ParserConfig = {
        type: 'csv',
        template_name: 'generic-csv',
        config: PARSER_TEMPLATES['generic-csv'].config
      }

      return new StepResponse(fallbackConfig)
    }
  },
  // Compensation logic - nothing to rollback for detection step
  // This step only reads data and doesn't modify anything
  async () => {
    return new StepResponse(void 0, {})
  }
)
