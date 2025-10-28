/**
 * Step 3: Field Mapping Component
 *
 * Maps parsed columns to data model fields with auto-suggestions,
 * template loading, and template saving capabilities.
 *
 * @see TEM-304 - Frontend: Build Step 3 - Field Mapping Component
 */

import { useState, useEffect } from "react"
import { Button, Text, Input, Label, Select, Checkbox, Badge, toast } from "@medusajs/ui"
import { CheckCircle, ExclamationCircle } from "@medusajs/icons"
import { ParseConfig } from "./Step2ParseConfiguration"

interface Step3FieldMappingProps {
  parsedColumns: string[]
  parseConfig: ParseConfig
  previewRows: Array<Record<string, any>>
  supplierId: string
  onComplete: (mapping: ColumnMapping, saveAsTemplate: boolean, templateName?: string, templateDescription?: string) => void
  onBack: () => void
}

export interface ColumnMapping {
  [parsedColumn: string]: string | null
}

interface ImportTemplate {
  id: string
  name: string
  description?: string
  file_type: 'csv' | 'txt'
  parse_config: ParseConfig
  column_mapping: ColumnMapping
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Field aliases for auto-suggestion
const FIELD_ALIASES: Record<string, string[]> = {
  supplier_sku: ["sku", "part_number", "part_no", "partnumber", "onderdeelnummer", "supplier_part", "supplier_sku", "part_id"],
  variant_sku: ["variant_sku", "internal_sku", "our_sku", "product_sku", "item_sku"],
  gross_price: ["gross_price", "gross price", "list_price", "list price", "listprice", "lijstprijs", "bruto prijs", "gross", "msrp", "retail_price"],
  discount_code: ["discount_code", "discount code", "discount_cd", "disc_code", "kortingscode", "code"],
  discount_percentage: ["discount_percentage", "discount %", "discount_pct", "disc_pct", "discount_percent", "korting %"],
  net_price: ["net_price", "net price", "netto prijs", "final_price", "cost_price", "purchase_price", "inkoopprijs", "net", "price"],
  description: ["description", "product_description", "desc", "omschrijving", "beschrijving", "product_desc", "item_description", "name", "product_name"],
  category: ["category", "product_category", "cat", "categorie", "productcategorie", "product category", "item_category", "group"],
  quantity: ["quantity", "qty", "amount", "stock", "available"],
  lead_time_days: ["lead_time", "lead_time_days", "delivery_time", "days"],
  notes: ["notes", "comment", "remarks", "info"],
}

const TARGET_FIELDS = [
  { value: "supplier_sku", label: "Supplier SKU", required: true, group: "identifiers" },
  { value: "variant_sku", label: "Variant SKU", required: true, group: "identifiers" },
  { value: "net_price", label: "Net Price", required: true, group: "pricing" },
  { value: "gross_price", label: "Gross Price", required: false, group: "pricing" },
  { value: "discount_code", label: "Discount Code", required: false, group: "pricing" },
  { value: "discount_percentage", label: "Discount Percentage", required: false, group: "pricing" },
  { value: "description", label: "Description", required: false, group: "product_info" },
  { value: "category", label: "Category", required: false, group: "product_info" },
  { value: "quantity", label: "Quantity", required: false, group: "other" },
  { value: "lead_time_days", label: "Lead Time (Days)", required: false, group: "other" },
  { value: "notes", label: "Notes", required: false, group: "other" },
]

export function Step3FieldMapping({
  parsedColumns,
  parseConfig,
  previewRows,
  supplierId,
  onComplete,
  onBack,
}: Step3FieldMappingProps) {
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [validation, setValidation] = useState<ValidationResult>({ isValid: false, errors: [], warnings: [] })
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [existingTemplates, setExistingTemplates] = useState<ImportTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Auto-suggest mapping on mount
  useEffect(() => {
    const autoSuggested = autoSuggestMapping(parsedColumns)
    setColumnMapping(autoSuggested)
  }, [parsedColumns])

  // Load existing templates
  useEffect(() => {
    loadTemplates()
  }, [supplierId, parseConfig.format_type])

  // Validate mapping whenever it changes
  useEffect(() => {
    const result = validateMapping(columnMapping)
    setValidation(result)
  }, [columnMapping])

  const autoSuggestMapping = (columns: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {}

    for (const parsedCol of columns) {
      const normalized = parsedCol.toLowerCase().trim().replace(/[_\s-]+/g, '_')

      // Try exact match first
      if (TARGET_FIELDS.some(f => f.value === normalized)) {
        mapping[parsedCol] = normalized
        continue
      }

      // Try alias matching
      let matched = false
      for (const [targetField, aliases] of Object.entries(FIELD_ALIASES)) {
        for (const alias of aliases) {
          const normalizedAlias = alias.toLowerCase().trim().replace(/[_\s-]+/g, '_')
          if (normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
            mapping[parsedCol] = targetField
            matched = true
            break
          }
        }
        if (matched) break
      }

      // If no match, leave unmapped
      if (!matched) {
        mapping[parsedCol] = null
      }
    }

    return mapping
  }

  const validateMapping = (mapping: ColumnMapping): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    const mappedValues = Object.values(mapping).filter(v => v !== null)

    // Check required: at least one identifier
    const hasIdentifier = mappedValues.includes('supplier_sku') || mappedValues.includes('variant_sku')
    if (!hasIdentifier) {
      errors.push('Must map either Supplier SKU or Variant SKU')
    }

    // Check required: net_price
    if (!mappedValues.includes('net_price')) {
      errors.push('Must map Net Price field')
    }

    // Count unmapped columns
    const unmappedCount = Object.values(mapping).filter(v => v === null).length
    if (unmappedCount > 0) {
      warnings.push(`${unmappedCount} column(s) will be ignored during import`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const fileType = parseConfig.format_type === 'csv' ? 'csv' : 'txt'
      const response = await fetch(
        `/admin/suppliers/${supplierId}/price-lists/import-templates?file_type=${fileType}`
      )

      if (!response.ok) {
        throw new Error('Failed to load templates')
      }

      const data = await response.json()
      setExistingTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const handleLoadTemplate = () => {
    const template = existingTemplates.find(t => t.id === selectedTemplateId)
    if (!template) {
      toast.error('Please select a template')
      return
    }

    setColumnMapping(template.column_mapping)
    toast.success('Template loaded', {
      description: `Loaded mapping from "${template.name}"`,
    })
  }

  const handleMappingChange = (parsedColumn: string, targetField: string | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [parsedColumn]: targetField,
    }))
  }

  const handleComplete = () => {
    if (!validation.isValid) {
      toast.error('Cannot proceed', {
        description: validation.errors[0],
      })
      return
    }

    if (saveAsTemplate && !templateName.trim()) {
      toast.error('Template name required', {
        description: 'Please enter a name for the template',
      })
      return
    }

    // Check for duplicate template name
    if (saveAsTemplate && existingTemplates.some(t => t.name === templateName.trim())) {
      toast.error('Duplicate template name', {
        description: 'A template with this name already exists',
      })
      return
    }

    onComplete(
      columnMapping,
      saveAsTemplate,
      saveAsTemplate ? templateName.trim() : undefined,
      saveAsTemplate ? templateDescription.trim() : undefined
    )
  }

  // Create final preview with only mapped columns
  const mappedPreview = previewRows.map(row => {
    const mappedRow: Record<string, any> = {}
    for (const [parsedCol, targetField] of Object.entries(columnMapping)) {
      if (targetField && row[parsedCol] !== undefined) {
        mappedRow[targetField] = row[parsedCol]
      }
    }
    return mappedRow
  })

  const mappedColumns = Object.values(columnMapping).filter(v => v !== null) as string[]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Text size="large" weight="plus" className="mb-2">
          Map Columns to Fields
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Match your file columns to the required data fields
        </Text>
      </div>

      {/* Load Template */}
      {existingTemplates.length > 0 && (
        <div className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-subtle">
          <Label className="mb-3">Load Saved Template</Label>
          <div className="flex gap-2">
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select a template..." />
              </Select.Trigger>
              <Select.Content>
                {existingTemplates.map(template => (
                  <Select.Item key={template.id} value={template.id}>
                    {template.name}
                    {template.description && (
                      <span className="text-xs text-ui-fg-subtle ml-2">
                        - {template.description}
                      </span>
                    )}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Button
              variant="secondary"
              onClick={handleLoadTemplate}
              disabled={!selectedTemplateId}
            >
              Load
            </Button>
          </div>
          <Text size="xsmall" className="text-ui-fg-subtle mt-2">
            or configure mapping manually below
          </Text>
        </div>
      )}

      {/* Column Mapping Interface */}
      <div>
        <Label className="mb-3">Column Mapping</Label>
        <div className="space-y-3">
          {parsedColumns.map((parsedCol, idx) => {
            const currentMapping = columnMapping[parsedCol]
            const sampleValue = previewRows[0]?.[parsedCol] || ''
            const targetField = TARGET_FIELDS.find(f => f.value === currentMapping)

            return (
              <div
                key={idx}
                className="grid grid-cols-[2fr_3fr_2fr] gap-4 items-center p-3 border border-ui-border-base rounded-lg bg-ui-bg-base"
              >
                {/* Source Column */}
                <div>
                  <Text size="small" weight="plus">
                    {parsedCol}
                  </Text>
                  {targetField?.required && (
                    <Badge size="2xsmall" color="red" className="ml-2">
                      Required
                    </Badge>
                  )}
                </div>

                {/* Target Field Selector */}
                <Select
                  value={currentMapping || "__unmapped__"}
                  onValueChange={(value) => handleMappingChange(parsedCol, value === "__unmapped__" ? null : value)}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select target field..." />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="__unmapped__">Not mapped</Select.Item>
                    <Select.Group>
                      <Select.Label>Required Fields</Select.Label>
                      {TARGET_FIELDS.filter(f => f.required).map(field => (
                        <Select.Item key={field.value} value={field.value}>
                          {field.label}
                        </Select.Item>
                      ))}
                    </Select.Group>
                    <Select.Group>
                      <Select.Label>Optional Fields</Select.Label>
                      {TARGET_FIELDS.filter(f => !f.required).map(field => (
                        <Select.Item key={field.value} value={field.value}>
                          {field.label}
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Content>
                </Select>

                {/* Sample Preview */}
                <div className="text-right">
                  <Text size="xsmall" className="text-ui-fg-muted truncate">
                    {sampleValue ? String(sampleValue).substring(0, 30) : '—'}
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Validation Status */}
      <div className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-subtle">
        <Label className="mb-3">Validation Status</Label>

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="mb-3">
            {validation.errors.map((error, idx) => (
              <div key={idx} className="flex items-center gap-2 text-ui-fg-error mb-1">
                <ExclamationCircle className="flex-shrink-0" />
                <Text size="small">{error}</Text>
              </div>
            ))}
          </div>
        )}

        {/* Success */}
        {validation.isValid && (
          <div className="flex items-center gap-2 text-ui-fg-on-color mb-3">
            <CheckCircle className="flex-shrink-0 bg-ui-tag-green-icon rounded-full" />
            <Text size="small">All required fields mapped correctly</Text>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div>
            {validation.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-center gap-2 text-ui-fg-subtle mb-1">
                <ExclamationCircle className="flex-shrink-0" />
                <Text size="xsmall">{warning}</Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Preview */}
      {validation.isValid && mappedColumns.length > 0 && (
        <div>
          <Label className="mb-3">Final Preview (with mapped fields only)</Label>
          <div className="overflow-x-auto border border-ui-border-base rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  {mappedColumns.map((col, idx) => {
                    const field = TARGET_FIELDS.find(f => f.value === col)
                    return (
                      <th key={idx} className="px-4 py-2 text-left font-medium border-b border-ui-border-base">
                        {field?.label || col}
                        {field?.required && (
                          <Badge size="2xsmall" color="red" className="ml-2">
                            Required
                          </Badge>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {mappedPreview.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-ui-border-base last:border-b-0">
                    {mappedColumns.map((col, colIdx) => (
                      <td key={colIdx} className="px-4 py-2">
                        {row[col] !== undefined ? String(row[col]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge size="small" color="green">
              {mappedColumns.length} fields mapped
            </Badge>
          </div>
        </div>
      )}

      {/* Save as Template */}
      <div className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-base">
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            id="save-template"
            checked={saveAsTemplate}
            onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
          />
          <Label htmlFor="save-template" className="cursor-pointer">
            Save this configuration as a template
          </Label>
        </div>

        {saveAsTemplate && (
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="template-name" className="mb-2">
                Template Name *
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Standard Price List"
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="template-description" className="mb-2">
                Description (Optional)
              </Label>
              <Input
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template"
                maxLength={1000}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between pt-4 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleComplete}
          disabled={!validation.isValid}
        >
          Import & Create Price List
        </Button>
      </div>
    </div>
  )
}
