/**
 * Step 3: Field Mapping Component (Refactored)
 *
 * Field-first approach: Show required/optional fields, ask users which column maps to each.
 * Follows MedusaJS design philosophy with clear hierarchy and progressive disclosure.
 *
 * @see TEM-304 - Frontend: Build Step 3 - Field Mapping Component
 */

import { useState, useEffect } from "react"
import { Button, Text, Heading, Label, Select, toast } from "@medusajs/ui"
import { CheckCircleSolid, ExclamationCircle } from "@medusajs/icons"
import { ParseConfig } from "./Step2ParseConfiguration"

type PricingMode = "net_only" | "calculated" | "percentage" | "code_mapping"

interface Step3FieldMappingProps {
  parsedColumns: string[]
  parseConfig: ParseConfig
  previewRows: Array<Record<string, any>>
  supplierId: string
  defaultPricingMode: string | null
  onComplete: (mapping: ColumnMapping, pricingMode: string, saveAsTemplate: boolean, templateName?: string, templateDescription?: string) => void
  onBack: () => void
}

// Column mapping format expected by backend: { parsedColumn: targetField }
export interface ColumnMapping {
  [parsedColumn: string]: string | null
}

interface TargetField {
  value: string
  label: string
  description: string
  required: boolean
  group: 'identifiers' | 'pricing' | 'product_info' | 'other'
}

// Field aliases for auto-suggestion
const FIELD_ALIASES: Record<string, string[]> = {
  variant_sku: ["variant_sku", "internal_sku", "our_sku", "product_sku", "item_sku"],
  gross_price: ["gross_price", "gross price", "list_price", "list price", "listprice", "lijstprijs", "bruto prijs", "gross", "msrp", "retail_price"],
  discount_code: ["discount_code", "discount code", "discount_cd", "disc_code", "kortingscode", "code"],
  discount_percentage: ["discount_percentage", "discount %", "discount_pct", "disc_pct", "discount_percent", "korting %"],
  net_price: ["net_price", "net price", "netto prijs", "final_price", "cost_price", "purchase_price", "inkoopprijs", "net", "price"],
  product_title: ["product_title", "product_name", "product name", "product", "title", "name", "productnaam", "artikel"],
  variant_title: ["variant_title", "variant_name", "variant name", "variant", "option", "size", "color", "variantnaam"],
  description: ["description", "product_description", "desc", "omschrijving", "beschrijving", "product_desc", "item_description"],
  category: ["category", "product_category", "cat", "categorie", "productcategorie", "product category", "item_category", "group"],
  quantity: ["quantity", "qty", "amount", "stock", "available"],
  notes: ["notes", "comment", "remarks", "info"],
}

// Get required fields based on pricing mode
const getRequiredFieldsForMode = (pricingMode: PricingMode): TargetField[] => {
  const baseFields: TargetField[] = [
    {
      value: "product_title",
      label: "Product Title",
      description: "Name of the product",
      required: true,
      group: "product_info"
    },
    {
      value: "variant_title",
      label: "Variant Title",
      description: "Variant details (size, color, etc.)",
      required: true,
      group: "product_info"
    },
    {
      value: "variant_sku",
      label: "Variant SKU",
      description: "Your internal SKU/product code",
      required: true,
      group: "identifiers"
    },
    {
      value: "gross_price",
      label: "Gross Price",
      description: "List price before discounts",
      required: true,
      group: "pricing"
    },
    {
      value: "description",
      label: "Description",
      description: "Product description or details",
      required: true,
      group: "product_info"
    },
  ]

  // Discount field changes based on pricing mode
  const discountField: Record<PricingMode, TargetField | null> = {
    net_only: null, // No discount field for net-only mode
    calculated: {
      value: "net_price",
      label: "Discount (Net Price)",
      description: "Pre-calculated net price",
      required: true,
      group: "pricing"
    },
    percentage: {
      value: "discount_percentage",
      label: "Discount (Percentage)",
      description: "Discount percentage",
      required: true,
      group: "pricing"
    },
    code_mapping: {
      value: "discount_code",
      label: "Discount (Code)",
      description: "Supplier discount code",
      required: true,
      group: "pricing"
    }
  }

  const discount = discountField[pricingMode]
  return discount ? [...baseFields, discount] : baseFields
}

// Optional fields - available for all modes
const OPTIONAL_FIELDS: TargetField[] = [
  {
    value: "net_price",
    label: "Net Price",
    description: "Final price after discounts (optional for most modes)",
    required: false,
    group: "pricing"
  },
  {
    value: "category",
    label: "Category",
    description: "Product category or classification",
    required: false,
    group: "product_info"
  },
  {
    value: "quantity",
    label: "Quantity",
    description: "Available quantity or stock level",
    required: false,
    group: "other"
  },
  {
    value: "notes",
    label: "Notes",
    description: "Additional information or comments",
    required: false,
    group: "other"
  },
]

export function Step3FieldMapping({
  parsedColumns,
  parseConfig,
  previewRows,
  supplierId,
  defaultPricingMode,
  onComplete,
  onBack,
}: Step3FieldMappingProps) {
  // Pricing mode state
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    (defaultPricingMode as PricingMode) || "net_only"
  )
  const [hasSupplierCodeMapping, setHasSupplierCodeMapping] = useState(false)
  const [isLoadingDiscountStructure, setIsLoadingDiscountStructure] = useState(false)

  // Field-to-column mapping (1-to-1, but same column can map to multiple fields)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  // Get dynamic required fields based on pricing mode
  const requiredFields = getRequiredFieldsForMode(pricingMode)

  // Fetch supplier discount structure to check if code mappings exist
  useEffect(() => {
    const fetchDiscountStructure = async () => {
      setIsLoadingDiscountStructure(true)
      try {
        const response = await fetch(`/admin/suppliers/${supplierId}/discount-structure`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          const hasCodeMappings = data.discount_structure?.type === 'code_mapping' &&
                                  Object.keys(data.discount_structure?.mappings || {}).length > 0
          setHasSupplierCodeMapping(hasCodeMappings)
        }
      } catch (error) {
        console.error('Failed to fetch discount structure:', error)
      } finally {
        setIsLoadingDiscountStructure(false)
      }
    }

    if (supplierId) {
      fetchDiscountStructure()
    }
  }, [supplierId])

  // Auto-suggest mapping on mount and when pricing mode changes
  useEffect(() => {
    const autoSuggested = autoSuggestMapping(parsedColumns, requiredFields)
    setFieldMapping(autoSuggested)
  }, [parsedColumns, pricingMode])

  const autoSuggestMapping = (columns: string[], fields: TargetField[]): Record<string, string> => {
    const mapping: Record<string, string> = {}
    const allFields = [...fields, ...OPTIONAL_FIELDS]

    for (const field of allFields) {
      const fieldAliases = FIELD_ALIASES[field.value] || []

      for (const col of columns) {
        const normalized = col.toLowerCase().trim().replace(/[_\s-]+/g, '_')

        // Try exact match
        if (normalized === field.value) {
          mapping[field.value] = col
          break
        }

        // Try alias matching
        for (const alias of fieldAliases) {
          const normalizedAlias = alias.toLowerCase().trim().replace(/[_\s-]+/g, '_')
          if (normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
            mapping[field.value] = col
            break
          }
        }

        if (mapping[field.value]) break
      }
    }

    return mapping
  }

  // Return field-to-column mapping (allows same column to be used by multiple fields)
  const getFieldMapping = (): Record<string, string> => {
    const mapping: Record<string, string> = {}

    for (const [field, column] of Object.entries(fieldMapping)) {
      if (column) {
        mapping[field] = column
      }
    }

    return mapping
  }

  // Validation
  const requiredFieldsMapped = requiredFields.every(
    field => !!fieldMapping[field.value]
  )
  const mappedRequiredCount = requiredFields.filter(
    field => !!fieldMapping[field.value]
  ).length
  const mappedOptionalCount = OPTIONAL_FIELDS.filter(
    field => !!fieldMapping[field.value]
  ).length

  const isValid = requiredFieldsMapped

  const handleFieldMappingChange = (fieldValue: string, columnName: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [fieldValue]: columnName || ''
    }))
  }

  const handleComplete = () => {
    if (!isValid) {
      toast.error('Cannot proceed', {
        description: 'Please map all required fields',
      })
      return
    }

    // Validate code mapping mode
    if (pricingMode === 'code_mapping' && !hasSupplierCodeMapping) {
      toast.error('Discount code mappings required', {
        description: 'Please configure discount code mappings in supplier settings',
      })
      return
    }

    // Return field-to-column mapping (allows multiple fields to use same column)
    const mapping = getFieldMapping()

    // Convert to column-to-field format for backward compatibility
    // Note: If multiple fields use the same column, we need to decide which field wins
    // For now, we'll use the first occurrence
    const columnMapping: ColumnMapping = {}
    for (const col of parsedColumns) {
      columnMapping[col] = null
    }

    for (const [field, column] of Object.entries(mapping)) {
      if (column && !columnMapping[column]) {
        columnMapping[column] = field
      }
    }

    onComplete(columnMapping, pricingMode, false)
  }

  return (
    <div className="flex flex-col gap-y-8">
      {/* Header */}
      <div>
        <Heading level="h2" className="mb-2">
          Map Your Data
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Match your file columns to the required fields
        </Text>
      </div>

      {/* Pricing Mode Selection */}
      <div className="border border-ui-border-base rounded-lg p-6 bg-ui-bg-base">
        <div className="space-y-4">
          <div>
            <Label>Pricing Mode</Label>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              Select how prices are structured in this file
            </Text>
          </div>

          <Select value={pricingMode} onValueChange={(value) => setPricingMode(value as PricingMode)}>
            <Select.Trigger>
              <Select.Value placeholder="Select pricing mode" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="net_only">
                <div className="flex flex-col">
                  <Text size="small" weight="plus">Net Price Only</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Supplier provides final net prices (no discount information)
                  </Text>
                </div>
              </Select.Item>
              <Select.Item value="calculated">
                <div className="flex flex-col">
                  <Text size="small" weight="plus">Pre-calculated (Gross + Net)</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Supplier provides both gross and net prices
                  </Text>
                </div>
              </Select.Item>
              <Select.Item value="percentage">
                <div className="flex flex-col">
                  <Text size="small" weight="plus">Gross + Discount Percentage</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Supplier provides gross price and discount percentage
                  </Text>
                </div>
              </Select.Item>
              <Select.Item value="code_mapping">
                <div className="flex flex-col">
                  <Text size="small" weight="plus">Gross + Discount Code</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Supplier provides gross price and discount code (e.g., A, B, C)
                  </Text>
                </div>
              </Select.Item>
            </Select.Content>
          </Select>

          {/* Warning if code mapping selected but no supplier config */}
          {pricingMode === 'code_mapping' && !isLoadingDiscountStructure && !hasSupplierCodeMapping && (
            <div className="p-3 bg-ui-bg-base border border-ui-border-error rounded flex items-start gap-2">
              <ExclamationCircle className="text-ui-fg-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-error font-medium">
                  No discount code mappings configured
                </Text>
                <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                  Configure discount code mappings in <a href={`/app/settings/suppliers/${supplierId}/configuration`} className="text-ui-fg-interactive underline">Supplier Configuration</a>
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Required Fields Card */}
      <div className="border border-ui-border-base rounded-lg p-6 bg-ui-bg-base">
        <div className="flex items-center justify-between mb-6">
          <Heading level="h3">Required Fields</Heading>
          <div className="flex items-center gap-2">
            {requiredFieldsMapped ? (
              <>
                <CheckCircleSolid className="text-ui-fg-on-color bg-ui-tag-green-icon rounded-full" />
                <Text size="small" className="text-ui-fg-subtle">
                  {mappedRequiredCount}/{requiredFields.length} Complete
                </Text>
              </>
            ) : (
              <>
                <ExclamationCircle className="text-ui-fg-error" />
                <Text size="small" className="text-ui-fg-error">
                  {mappedRequiredCount}/{requiredFields.length} Mapped
                </Text>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {requiredFields.map((field) => {
            const selectedColumn = fieldMapping[field.value] || ''
            const hasMapping = !!selectedColumn

            return (
              <div key={field.value} className="grid grid-cols-[240px_1fr_40px] gap-4 items-start">
                <div>
                  <Label className="mb-1">{field.label}</Label>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {field.description}
                  </Text>
                </div>

                <div>
                  <Select
                    value={selectedColumn || '__none__'}
                    onValueChange={(value) => {
                      if (value !== '__none__') {
                        handleFieldMappingChange(field.value, value)
                      } else {
                        handleFieldMappingChange(field.value, '')
                      }
                    }}
                  >
                    <Select.Trigger className={!hasMapping ? 'border-ui-border-error' : ''}>
                      <Select.Value placeholder="Select column..." />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="__none__">
                        <Text className="text-ui-fg-subtle">-- No mapping --</Text>
                      </Select.Item>
                      {parsedColumns.map((col) => (
                        <Select.Item key={col} value={col}>
                          <div className="flex flex-col">
                            <span>{col}</span>
                            {previewRows[0]?.[col] && (
                              <span className="text-xs text-ui-fg-subtle truncate max-w-xs">
                                e.g. {String(previewRows[0][col]).substring(0, 40)}
                              </span>
                            )}
                          </div>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div className="flex items-center justify-center pt-2">
                  {hasMapping && (
                    <CheckCircleSolid className="text-ui-tag-green-icon" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Optional Fields Card (Collapsible) */}
      <div className="border border-ui-border-base rounded-lg bg-ui-bg-base">
        <button
          onClick={() => setShowOptionalFields(!showOptionalFields)}
          className="w-full p-6 flex items-center justify-between hover:bg-ui-bg-subtle-hover transition-colors"
        >
          <div className="flex items-center gap-3">
            <Heading level="h3">Optional Fields</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {mappedOptionalCount} mapped
            </Text>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {showOptionalFields ? '−' : '+'}
          </Text>
        </button>

        {showOptionalFields && (
          <div className="px-6 pb-6 space-y-4 border-t border-ui-border-base pt-6">
            {OPTIONAL_FIELDS.map((field) => {
              const selectedColumn = fieldMapping[field.value] || ''
              const hasMapping = !!selectedColumn

              return (
                <div key={field.value} className="grid grid-cols-[240px_1fr_40px] gap-4 items-start">
                  <div>
                    <Label className="mb-1">{field.label}</Label>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {field.description}
                    </Text>
                  </div>

                  <div>
                    <Select
                      value={selectedColumn || '__none__'}
                      onValueChange={(value) => {
                        if (value !== '__none__') {
                          handleFieldMappingChange(field.value, value)
                        } else {
                          handleFieldMappingChange(field.value, '')
                        }
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select column..." />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="__none__">
                          <Text className="text-ui-fg-subtle">-- No mapping --</Text>
                        </Select.Item>
                        {parsedColumns.map((col) => (
                          <Select.Item key={col} value={col}>
                            <div className="flex flex-col">
                              <span>{col}</span>
                              {previewRows[0]?.[col] && (
                                <span className="text-xs text-ui-fg-subtle truncate max-w-xs">
                                  e.g. {String(previewRows[0][col]).substring(0, 40)}
                                </span>
                              )}
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>

                  <div className="flex items-center justify-center pt-2">
                    {hasMapping && (
                      <CheckCircleSolid className="text-ui-tag-green-icon" />
                    )}
                  </div>
                </div>
              )
            })}
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
          disabled={!isValid}
        >
          Import & Create Price List
        </Button>
      </div>
    </div>
  )
}
