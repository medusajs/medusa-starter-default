import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import {
  Container,
  Heading,
  Button,
  Select,
  Input,
  Label,
  Text,
  toast,
  Table,
  IconButton,
} from "@medusajs/ui"
import { Trash, Plus } from "@medusajs/icons"

type DiscountStructureType = "code_mapping" | "percentage" | "calculated" | "net_only"

interface DiscountStructure {
  type: DiscountStructureType
  mappings?: Record<string, number>
  default_percentage?: number
}

interface SupplierDiscountConfigSectionProps {
  supplier: any
}

export const SupplierDiscountConfigSection = ({
  supplier,
}: SupplierDiscountConfigSectionProps) => {
  const queryClient = useQueryClient()

  // Initialize state from supplier metadata
  const initialDiscountStructure: DiscountStructure = supplier?.metadata?.discount_structure || {
    type: "net_only",
    mappings: {},
    default_percentage: undefined,
  }

  const [discountType, setDiscountType] = useState<DiscountStructureType>(
    initialDiscountStructure.type
  )
  const [mappings, setMappings] = useState<Record<string, number>>(
    initialDiscountStructure.mappings || {}
  )
  const [defaultPercentage, setDefaultPercentage] = useState<number | undefined>(
    initialDiscountStructure.default_percentage
  )
  const [newCodeKey, setNewCodeKey] = useState("")
  const [newCodeValue, setNewCodeValue] = useState("")

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const discountStructure: DiscountStructure = {
        type: discountType,
      }

      if (discountType === "code_mapping") {
        discountStructure.mappings = mappings
      } else if (discountType === "percentage") {
        discountStructure.default_percentage = defaultPercentage
      }

      const response = await fetch(
        `/admin/suppliers/${supplier.id}/discount-structure`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discountStructure),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save discount configuration")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", supplier.id] })
      toast.success("Discount configuration saved successfully")
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`)
    },
  })

  const handleSave = () => {
    // Validation
    if (discountType === "code_mapping" && Object.keys(mappings).length === 0) {
      toast.error("Please add at least one discount code mapping")
      return
    }

    if (discountType === "percentage" && (defaultPercentage === undefined || defaultPercentage < 0 || defaultPercentage > 100)) {
      toast.error("Please enter a valid percentage (0-100)")
      return
    }

    saveMutation.mutate()
  }

  const handleAddMapping = () => {
    if (!newCodeKey.trim()) {
      toast.error("Please enter a discount code")
      return
    }

    const percentage = parseFloat(newCodeValue)
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Please enter a valid percentage (0-100)")
      return
    }

    setMappings({ ...mappings, [newCodeKey.trim()]: percentage })
    setNewCodeKey("")
    setNewCodeValue("")
  }

  const handleRemoveMapping = (code: string) => {
    const newMappings = { ...mappings }
    delete newMappings[code]
    setMappings(newMappings)
  }

  const handleUpdateMapping = (code: string, value: string) => {
    const percentage = parseFloat(value)
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      setMappings({ ...mappings, [code]: percentage })
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Discount Configuration</Heading>
        <Button onClick={handleSave} isLoading={saveMutation.isPending}>
          Save Configuration
        </Button>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-6">
          {/* Discount Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="discount-type">Discount Type</Label>
            <Select
              value={discountType}
              onValueChange={(value) => setDiscountType(value as DiscountStructureType)}
            >
              <Select.Trigger id="discount-type">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="net_only">Net Price Only</Select.Item>
                <Select.Item value="code_mapping">Discount Code Mapping</Select.Item>
                <Select.Item value="percentage">Fixed Percentage</Select.Item>
                <Select.Item value="calculated">Pre-calculated (Gross + Net)</Select.Item>
              </Select.Content>
            </Select>
            <Text size="small" className="text-ui-fg-subtle">
              {discountType === "net_only" && "Only net prices are provided (no discount calculation)"}
              {discountType === "code_mapping" && "Map discount codes to percentage values"}
              {discountType === "percentage" && "Apply a fixed percentage discount to all items"}
              {discountType === "calculated" && "Gross and net prices are pre-calculated in the file"}
            </Text>
          </div>

          {/* Conditional Rendering Based on Type */}
          {discountType === "code_mapping" && (
            <div className="space-y-4">
              <div>
                <Label>Discount Code Mappings</Label>
                <Text size="small" className="text-ui-fg-subtle mb-3">
                  Define how discount codes map to percentage values
                </Text>

                {Object.keys(mappings).length > 0 && (
                  <div className="border rounded-lg overflow-hidden mb-4">
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell>Code</Table.HeaderCell>
                          <Table.HeaderCell>Percentage</Table.HeaderCell>
                          <Table.HeaderCell className="w-[100px]">Actions</Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {Object.entries(mappings).map(([code, percentage]) => (
                          <Table.Row key={code}>
                            <Table.Cell>
                              <Text className="font-mono font-medium">{code}</Text>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={percentage}
                                  onChange={(e) => handleUpdateMapping(code, e.target.value)}
                                  className="w-24"
                                />
                                <Text size="small">%</Text>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <IconButton
                                variant="transparent"
                                onClick={() => handleRemoveMapping(code)}
                              >
                                <Trash className="text-ui-fg-error" />
                              </IconButton>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  </div>
                )}

                {/* Add New Mapping */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="new-code">Discount Code</Label>
                    <Input
                      id="new-code"
                      placeholder="e.g., A, B, SPECIAL"
                      value={newCodeKey}
                      onChange={(e) => setNewCodeKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddMapping()
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="new-percentage">Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0.0"
                        value={newCodeValue}
                        onChange={(e) => setNewCodeValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddMapping()
                          }
                        }}
                      />
                      <Text size="small">%</Text>
                    </div>
                  </div>
                  <Button onClick={handleAddMapping} variant="secondary">
                    <Plus />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {discountType === "percentage" && (
            <div className="space-y-2">
              <Label htmlFor="default-percentage">Default Discount Percentage</Label>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  id="default-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0.0"
                  value={defaultPercentage || ""}
                  onChange={(e) => setDefaultPercentage(parseFloat(e.target.value) || undefined)}
                />
                <Text size="small">%</Text>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                This percentage will be applied to all items in the price list
              </Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
