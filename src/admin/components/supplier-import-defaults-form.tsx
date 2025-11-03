/**
 * Supplier Import Defaults Configuration Form
 *
 * Allows admins to configure default import settings for a supplier:
 * - Default pricing mode (derived from discount structure if not set)
 * - Default parsing method (template, delimited, or fixed-width)
 * - Template selection (for template mode)
 * - Delimiter selection (for delimited mode)
 *
 * These defaults pre-populate the import wizard for faster repeat imports.
 * Stored in supplier.metadata.import_defaults
 */

import { useState, useEffect, useMemo } from "react"
import { Button, Label, RadioGroup, Select, Input, Heading, Text, toast } from "@medusajs/ui"
import { IMPORT_TEMPLATES } from "../lib/import-templates"

type PricingMode = "net_only" | "calculated" | "percentage" | "code_mapping"
type ParsingMethod = "template" | "delimited" | "fixed-width"

interface ImportDefaults {
  pricing_mode: PricingMode
  parsing_method: ParsingMethod
  template_id?: string
  delimiter?: string
}

interface SupplierImportDefaultsFormProps {
  supplierId: string
  initialDefaults?: ImportDefaults
  discountStructureType?: "net_only" | "calculated" | "percentage" | "code_mapping"
  onSaved?: (defaults: ImportDefaults) => void
}

export function SupplierImportDefaultsForm({
  supplierId,
  initialDefaults,
  discountStructureType,
  onSaved
}: SupplierImportDefaultsFormProps) {
  // Derive default pricing mode from discount structure if not explicitly set
  const derivedPricingMode = discountStructureType || "net_only"

  const [pricingMode, setPricingMode] = useState<PricingMode>(
    initialDefaults?.pricing_mode || derivedPricingMode
  )
  const [parsingMethod, setParsingMethod] = useState<ParsingMethod>(
    initialDefaults?.parsing_method || "delimited"
  )
  const [templateId, setTemplateId] = useState(initialDefaults?.template_id || "")
  const [delimiter, setDelimiter] = useState(initialDefaults?.delimiter || ",")
  const [customDelimiter, setCustomDelimiter] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Available templates from registry
  const templates = useMemo(() => Object.values(IMPORT_TEMPLATES), [])

  // Update pricing mode when discount structure changes
  useEffect(() => {
    if (discountStructureType && !initialDefaults?.pricing_mode) {
      setPricingMode(discountStructureType)
    }
  }, [discountStructureType, initialDefaults?.pricing_mode])

  // Update form when initialDefaults changes
  useEffect(() => {
    if (initialDefaults) {
      setPricingMode(initialDefaults.pricing_mode)
      setParsingMethod(initialDefaults.parsing_method)
      setTemplateId(initialDefaults.template_id || "")
      setDelimiter(initialDefaults.delimiter || ",")
    }
  }, [initialDefaults])

  const standardDelimiters = [",", ";", "\t", "|"]
  const isCustomDelimiter = delimiter !== "" && !standardDelimiters.includes(delimiter)

  const validateAndSave = async () => {
    // Build import defaults object
    const importDefaults: ImportDefaults = {
      pricing_mode: pricingMode,
      parsing_method: parsingMethod
    }

    // Validate template mode
    if (parsingMethod === "template") {
      if (!templateId) {
        toast.error("Template required", {
          description: "Please select a template"
        })
        return
      }
      importDefaults.template_id = templateId
    }

    // Validate delimited mode
    if (parsingMethod === "delimited") {
      const finalDelimiter = isCustomDelimiter ? customDelimiter : delimiter
      if (!finalDelimiter) {
        toast.error("Delimiter required", {
          description: "Please select or enter a delimiter"
        })
        return
      }
      importDefaults.delimiter = finalDelimiter
    }

    // Save to backend
    setIsSaving(true)
    try {
      const response = await fetch(
        `/admin/suppliers/${supplierId}/import-defaults`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(importDefaults),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save import defaults')
      }

      toast.success('Import defaults saved', {
        description: 'Configuration updated successfully'
      })

      onSaved?.(importDefaults)
    } catch (error: any) {
      console.error('Failed to save import defaults:', error)
      toast.error('Failed to save', {
        description: error.message || 'An error occurred'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading level="h3" className="mb-2">Default Import Settings</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Configure default settings to pre-populate the import wizard
        </Text>
      </div>

      {/* Pricing Mode */}
      <div className="space-y-4">
        <div>
          <Label>Default Pricing Mode</Label>
          {discountStructureType && (
            <Text size="xsmall" className="text-ui-fg-subtle mt-1">
              Auto-filled from discount structure configuration
            </Text>
          )}
        </div>
        <RadioGroup value={pricingMode} onValueChange={(value) => setPricingMode(value as PricingMode)}>
          <div className="flex items-center gap-2">
            <RadioGroup.Item value="net_only" id="pm_net_only" />
            <Label htmlFor="pm_net_only" className="cursor-pointer">Net Price Only</Label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroup.Item value="calculated" id="pm_calculated" />
            <Label htmlFor="pm_calculated" className="cursor-pointer">Pre-calculated (Gross + Net)</Label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroup.Item value="percentage" id="pm_percentage" />
            <Label htmlFor="pm_percentage" className="cursor-pointer">Fixed Percentage Discount</Label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroup.Item value="code_mapping" id="pm_code_mapping" />
            <Label htmlFor="pm_code_mapping" className="cursor-pointer">Discount Codes</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Parsing Method */}
      <div className="space-y-4">
        <Label>Default Parsing Method</Label>
        <RadioGroup value={parsingMethod} onValueChange={(value) => setParsingMethod(value as ParsingMethod)}>
          <div className="flex items-start gap-2">
            <RadioGroup.Item value="template" id="parse_template" />
            <div className="flex-1">
              <Label htmlFor="parse_template" className="cursor-pointer">Template</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Use a predefined template for this supplier's format
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <RadioGroup.Item value="delimited" id="parse_delimited" />
            <div className="flex-1">
              <Label htmlFor="parse_delimited" className="cursor-pointer">Delimited (CSV)</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Parse CSV or other delimited files
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <RadioGroup.Item value="fixed-width" id="parse_fixed" />
            <div className="flex-1">
              <Label htmlFor="parse_fixed" className="cursor-pointer">Fixed-Width</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Parse fixed-width text files with column positions
              </Text>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Template Selection (for template mode) */}
      {parsingMethod === "template" && (
        <div>
          <Label>Select Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <Select.Trigger>
              <Select.Value placeholder="Choose a template" />
            </Select.Trigger>
            <Select.Content>
              {templates.map((template) => (
                <Select.Item key={template.id} value={template.id}>
                  {template.name}
                  {template.description && (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {template.description}
                    </Text>
                  )}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      )}

      {/* Delimiter Selection (for delimited mode) */}
      {parsingMethod === "delimited" && (
        <div className="space-y-3">
          <Label>Delimiter</Label>
          <RadioGroup
            value={isCustomDelimiter ? "custom" : delimiter}
            onValueChange={(value) => {
              if (value === "custom") {
                setDelimiter("")
              } else {
                setDelimiter(value)
              }
            }}
          >
            <div className="flex items-center gap-2">
              <RadioGroup.Item value="," id="delim_comma" />
              <Label htmlFor="delim_comma" className="cursor-pointer">Comma (,)</Label>
            </div>

            <div className="flex items-center gap-2">
              <RadioGroup.Item value=";" id="delim_semicolon" />
              <Label htmlFor="delim_semicolon" className="cursor-pointer">Semicolon (;)</Label>
            </div>

            <div className="flex items-center gap-2">
              <RadioGroup.Item value="\t" id="delim_tab" />
              <Label htmlFor="delim_tab" className="cursor-pointer">Tab</Label>
            </div>

            <div className="flex items-center gap-2">
              <RadioGroup.Item value="|" id="delim_pipe" />
              <Label htmlFor="delim_pipe" className="cursor-pointer">Pipe (|)</Label>
            </div>

            <div className="flex items-start gap-2">
              <RadioGroup.Item value="custom" id="delim_custom" />
              <div className="flex-1">
                <Label htmlFor="delim_custom" className="cursor-pointer mb-2">Custom</Label>
                {(isCustomDelimiter || delimiter === "") && (
                  <Input
                    type="text"
                    placeholder="Enter delimiter"
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    maxLength={1}
                    className="max-w-[200px]"
                  />
                )}
              </div>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={validateAndSave}
          isLoading={isSaving}
          disabled={isSaving}
        >
          Save Import Defaults
        </Button>
      </div>
    </div>
  )
}
