/**
 * Supplier Discount Configuration Form
 *
 * Allows admins to configure supplier-specific discount structures:
 * - Net-only: Supplier provides net prices only
 * - Pre-calculated: Supplier provides both gross and net prices
 * - Fixed Percentage: Apply a fixed discount percentage to all items
 * - Discount Codes: Map supplier discount codes to percentages
 *
 * Stored in supplier.metadata.discount_structure
 */

import { useState, useEffect } from "react"
import { Button, Label, RadioGroup, Input, Heading, Text, toast, Tooltip } from "@medusajs/ui"
import { Trash, Plus, InformationCircleSolid } from "@medusajs/icons"

type DiscountStructureType = "net_only" | "calculated" | "percentage" | "code_mapping"

interface DiscountStructure {
  type: DiscountStructureType
  description?: string
  default_percentage?: number
  mappings?: Record<string, number>
}

interface SupplierDiscountConfigFormProps {
  supplierId: string
  initialStructure?: DiscountStructure
  onSaved?: (structure: DiscountStructure) => void
}

export function SupplierDiscountConfigForm({
  supplierId,
  initialStructure,
  onSaved
}: SupplierDiscountConfigFormProps) {
  const [discountType, setDiscountType] = useState<DiscountStructureType>(
    initialStructure?.type || "net_only"
  )
  const [description, setDescription] = useState(initialStructure?.description || "")
  const [defaultPercentage, setDefaultPercentage] = useState(
    initialStructure?.default_percentage?.toString() || ""
  )
  const [codeMappings, setCodeMappings] = useState<Array<{ code: string; percentage: string }>>(
    initialStructure?.mappings
      ? Object.entries(initialStructure.mappings).map(([code, percentage]) => ({
          code,
          percentage: percentage.toString()
        }))
      : [{ code: "", percentage: "" }]
  )
  const [isSaving, setIsSaving] = useState(false)

  // Update form when initialStructure changes
  useEffect(() => {
    if (initialStructure) {
      setDiscountType(initialStructure.type)
      setDescription(initialStructure.description || "")
      setDefaultPercentage(initialStructure.default_percentage?.toString() || "")
      if (initialStructure.mappings) {
        setCodeMappings(
          Object.entries(initialStructure.mappings).map(([code, percentage]) => ({
            code,
            percentage: percentage.toString()
          }))
        )
      }
    }
  }, [initialStructure])

  const handleAddCodeMapping = () => {
    setCodeMappings([...codeMappings, { code: "", percentage: "" }])
  }

  const handleRemoveCodeMapping = (index: number) => {
    setCodeMappings(codeMappings.filter((_, i) => i !== index))
  }

  const handleCodeChange = (index: number, value: string) => {
    const updated = [...codeMappings]
    updated[index].code = value.toUpperCase() // Convert to uppercase for consistency
    setCodeMappings(updated)
  }

  const handlePercentageChange = (index: number, value: string) => {
    const updated = [...codeMappings]
    updated[index].percentage = value
    setCodeMappings(updated)
  }

  const validateAndSave = async () => {
    // Build discount structure based on type
    let discountStructure: DiscountStructure = {
      type: discountType,
      description: description || undefined
    }

    // Validate percentage type
    if (discountType === "percentage") {
      const percentage = parseFloat(defaultPercentage)
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast.error("Invalid percentage", {
          description: "Percentage must be between 0 and 100"
        })
        return
      }
      discountStructure.default_percentage = percentage
    }

    // Validate code_mapping type
    if (discountType === "code_mapping") {
      const mappings: Record<string, number> = {}

      for (const mapping of codeMappings) {
        // Skip empty rows
        if (!mapping.code && !mapping.percentage) continue

        // Validate both fields are filled
        if (!mapping.code || !mapping.percentage) {
          toast.error("Invalid code mapping", {
            description: "Both code and percentage are required"
          })
          return
        }

        // Validate percentage
        const percentage = parseFloat(mapping.percentage)
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          toast.error(`Invalid percentage for code "${mapping.code}"`, {
            description: "Percentage must be between 0 and 100"
          })
          return
        }

        // Check for duplicate codes
        if (mappings[mapping.code]) {
          toast.error(`Duplicate code "${mapping.code}"`, {
            description: "Each discount code must be unique"
          })
          return
        }

        mappings[mapping.code] = percentage
      }

      // Ensure at least one mapping
      if (Object.keys(mappings).length === 0) {
        toast.error("No discount codes defined", {
          description: "Add at least one code mapping"
        })
        return
      }

      discountStructure.mappings = mappings
    }

    // Save to backend
    setIsSaving(true)
    try {
      const response = await fetch(
        `/admin/suppliers/${supplierId}/discount-structure`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(discountStructure),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save discount structure')
      }

      toast.success('Discount structure saved', {
        description: 'Configuration updated successfully'
      })

      onSaved?.(discountStructure)
    } catch (error: any) {
      console.error('Failed to save discount structure:', error)
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
        <Heading level="h3" className="mb-2">Discount Structure</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Configure how discounts are provided in this supplier's price lists
        </Text>
      </div>

      {/* Discount Type Selection */}
      <div className="space-y-4">
        <Label>Discount Type</Label>
        <RadioGroup value={discountType} onValueChange={(value) => setDiscountType(value as DiscountStructureType)}>
          <div className="flex items-start gap-2">
            <RadioGroup.Item value="net_only" id="net_only" />
            <div className="flex-1">
              <Label htmlFor="net_only" className="cursor-pointer">Net Price Only</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Supplier provides final net prices (no discount information)
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <RadioGroup.Item value="calculated" id="calculated" />
            <div className="flex-1">
              <Label htmlFor="calculated" className="cursor-pointer">Pre-calculated (Gross + Net)</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Supplier provides both gross and net prices (discount is derived)
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <RadioGroup.Item value="percentage" id="percentage" />
            <div className="flex-1">
              <Label htmlFor="percentage" className="cursor-pointer">Fixed Percentage Discount</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Apply a fixed discount percentage to all items
              </Text>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <RadioGroup.Item value="code_mapping" id="code_mapping" />
            <div className="flex-1">
              <Label htmlFor="code_mapping" className="cursor-pointer">Discount Codes</Label>
              <Text size="small" className="text-ui-fg-subtle">
                Map supplier discount codes (e.g., A, B, C) to percentage values
              </Text>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Optional Description */}
      <div>
        <Label>Description (optional)</Label>
        <Input
          type="text"
          placeholder="e.g., Caterpillar discount code structure"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Percentage Input (for percentage type) */}
      {discountType === "percentage" && (
        <div>
          <Label>Default Discount Percentage</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="20"
              value={defaultPercentage}
              onChange={(e) => setDefaultPercentage(e.target.value)}
              className="max-w-[200px]"
            />
            <Text size="small" className="text-ui-fg-subtle">%</Text>
          </div>
        </div>
      )}

      {/* Code Mappings Table (for code_mapping type) */}
      {discountType === "code_mapping" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Discount Code Mappings</Label>
            <Tooltip content="Map supplier discount codes to percentage values. For example, code 'A' might mean 25% discount.">
              <InformationCircleSolid className="text-ui-fg-subtle" />
            </Tooltip>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[120px_120px_auto] gap-2 text-sm font-medium text-ui-fg-subtle">
              <div>Code</div>
              <div>Percentage</div>
              <div></div>
            </div>

            {/* Rows */}
            {codeMappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-[120px_120px_auto] gap-2 items-center">
                <Input
                  type="text"
                  placeholder="A"
                  value={mapping.code}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  className="uppercase"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="25"
                    value={mapping.percentage}
                    onChange={(e) => handlePercentageChange(index, e.target.value)}
                  />
                  <Text size="small" className="text-ui-fg-subtle">%</Text>
                </div>
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => handleRemoveCodeMapping(index)}
                  disabled={codeMappings.length === 1}
                >
                  <Trash className="text-ui-fg-subtle" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            size="small"
            onClick={handleAddCodeMapping}
          >
            <Plus />
            Add Code
          </Button>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={validateAndSave}
          isLoading={isSaving}
          disabled={isSaving}
        >
          Save Discount Structure
        </Button>
      </div>
    </div>
  )
}
