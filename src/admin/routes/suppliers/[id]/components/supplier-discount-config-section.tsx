import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useForm, Controller, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import {
  Container,
  Heading,
  Button,
  RadioGroup,
  Input,
  Label,
  Text,
  toast,
  Drawer,
  IconButton,
  Tooltip,
} from "@medusajs/ui"
import { Trash, Plus, PencilSquare, InformationCircleSolid } from "@medusajs/icons"

type DiscountStructureType = "net_only" | "calculated" | "percentage" | "code_mapping"

interface DiscountStructure {
  type: DiscountStructureType
  description?: string
  mappings?: Record<string, number>
  default_percentage?: number
}

interface SupplierDiscountConfigSectionProps {
  supplier: any
}

// Validation schema
const discountStructureSchema = zod.object({
  type: zod.enum(["net_only", "calculated", "percentage", "code_mapping"]),
  description: zod.string().optional(),
  default_percentage: zod.number().min(0).max(100).optional(),
  mappings: zod.record(zod.number().min(0).max(100)).optional(),
})

type DiscountStructureFormData = zod.infer<typeof discountStructureSchema>

export const SupplierDiscountConfigSection = ({
  supplier,
}: SupplierDiscountConfigSectionProps) => {
  const queryClient = useQueryClient()
  const [showEditDrawer, setShowEditDrawer] = useState(false)
  const [codeMappings, setCodeMappings] = useState<Array<{ code: string; percentage: string }>>([])

  // Initialize from supplier metadata
  const currentStructure: DiscountStructure = supplier?.metadata?.discount_structure || {
    type: "net_only",
  }

  const form = useForm<DiscountStructureFormData>({
    resolver: zodResolver(discountStructureSchema),
    defaultValues: {
      type: currentStructure.type,
      description: currentStructure.description || "",
      default_percentage: currentStructure.default_percentage,
      mappings: currentStructure.mappings || {},
    },
  })

  const discountType = form.watch("type")

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: DiscountStructureFormData) => {
      const response = await fetch(
        `/admin/suppliers/${supplier.id}/discount-structure`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
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
      setShowEditDrawer(false)
      toast.success("Discount configuration saved", {
        description: "Changes have been applied successfully",
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to save configuration", {
        description: error.message,
      })
    },
  })

  const handleEditClick = () => {
    // Reset form with current values
    form.reset({
      type: currentStructure.type,
      description: currentStructure.description || "",
      default_percentage: currentStructure.default_percentage,
      mappings: currentStructure.mappings || {},
    })

    // Initialize code mappings for the UI
    if (currentStructure.mappings) {
      setCodeMappings(
        Object.entries(currentStructure.mappings).map(([code, percentage]) => ({
          code,
          percentage: percentage.toString(),
        }))
      )
    } else {
      setCodeMappings([{ code: "", percentage: "" }])
    }

    setShowEditDrawer(true)
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    // Validate code mappings if type is code_mapping
    if (data.type === "code_mapping") {
      const mappings: Record<string, number> = {}

      for (const mapping of codeMappings) {
        if (!mapping.code && !mapping.percentage) continue

        if (!mapping.code || !mapping.percentage) {
          toast.error("Invalid code mapping", {
            description: "Both code and percentage are required",
          })
          return
        }

        const percentage = parseFloat(mapping.percentage)
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          toast.error(`Invalid percentage for code "${mapping.code}"`, {
            description: "Percentage must be between 0 and 100",
          })
          return
        }

        if (mappings[mapping.code]) {
          toast.error(`Duplicate code "${mapping.code}"`, {
            description: "Each discount code must be unique",
          })
          return
        }

        mappings[mapping.code] = percentage
      }

      if (Object.keys(mappings).length === 0) {
        toast.error("No discount codes defined", {
          description: "Add at least one code mapping",
        })
        return
      }

      data.mappings = mappings
    }

    updateMutation.mutate(data)
  })

  const handleAddCodeMapping = () => {
    setCodeMappings([...codeMappings, { code: "", percentage: "" }])
  }

  const handleRemoveCodeMapping = (index: number) => {
    setCodeMappings(codeMappings.filter((_, i) => i !== index))
  }

  const handleCodeChange = (index: number, value: string) => {
    const updated = [...codeMappings]
    updated[index].code = value.toUpperCase()
    setCodeMappings(updated)
  }

  const handlePercentageChange = (index: number, value: string) => {
    const updated = [...codeMappings]
    updated[index].percentage = value
    setCodeMappings(updated)
  }

  // Helper functions for display
  const getDiscountTypeLabel = (type: DiscountStructureType) => {
    switch (type) {
      case "net_only":
        return "Net Price Only"
      case "calculated":
        return "Pre-calculated (Gross + Net)"
      case "percentage":
        return "Fixed Percentage Discount"
      case "code_mapping":
        return "Discount Codes"
      default:
        return type
    }
  }

  const getDiscountTypeDescription = (type: DiscountStructureType) => {
    switch (type) {
      case "net_only":
        return "Only net prices are provided"
      case "calculated":
        return "Both gross and net prices are pre-calculated"
      case "percentage":
        return "Fixed discount applied to all items"
      case "code_mapping":
        return "Discount codes mapped to percentages"
      default:
        return ""
    }
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Discount Configuration</Heading>
          <Button
            variant="secondary"
            size="small"
            onClick={handleEditClick}
          >
            <PencilSquare className="w-4 h-4" />
            Edit
          </Button>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Text size="small" className="text-ui-fg-subtle mb-1">
                Discount Type
              </Text>
              <Text className="font-medium mb-1">
                {getDiscountTypeLabel(currentStructure.type)}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                {getDiscountTypeDescription(currentStructure.type)}
              </Text>
            </div>

            {currentStructure.type === "percentage" && currentStructure.default_percentage !== undefined && (
              <div>
                <Text size="small" className="text-ui-fg-subtle mb-1">
                  Default Percentage
                </Text>
                <Text className="font-medium">
                  {currentStructure.default_percentage}%
                </Text>
              </div>
            )}

            {currentStructure.type === "code_mapping" && currentStructure.mappings && (
              <div className="col-span-2">
                <Text size="small" className="text-ui-fg-subtle mb-2">
                  Discount Code Mappings
                </Text>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(currentStructure.mappings).map(([code, percentage]) => (
                    <div key={code} className="border rounded px-3 py-2">
                      <Text size="small" className="text-ui-fg-subtle">Code</Text>
                      <Text className="font-medium font-mono">{code}</Text>
                      <Text size="xsmall" className="text-ui-fg-muted">{percentage}%</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {currentStructure.description && (
            <div className="mt-4 pt-4 border-t">
              <Text size="small" className="text-ui-fg-subtle mb-1">
                Description
              </Text>
              <Text size="small">{currentStructure.description}</Text>
            </div>
          )}
        </div>
      </Container>

      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <Drawer.Content>
          <FormProvider {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <Drawer.Header>
                <Drawer.Title>Edit Discount Configuration</Drawer.Title>
                <Drawer.Description>
                  Configure how discounts are provided in this supplier's price lists
                </Drawer.Description>
              </Drawer.Header>

              <Drawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
                {/* Discount Type Selection */}
                <div className="space-y-4">
                  <Label>Discount Type</Label>
                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="net_only" id="drawer_net_only" />
                          <div className="flex-1">
                            <Label htmlFor="drawer_net_only" className="cursor-pointer">
                              Net Price Only
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Supplier provides final net prices (no discount information)
                            </Text>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="calculated" id="drawer_calculated" />
                          <div className="flex-1">
                            <Label htmlFor="drawer_calculated" className="cursor-pointer">
                              Pre-calculated (Gross + Net)
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Supplier provides both gross and net prices
                            </Text>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="percentage" id="drawer_percentage" />
                          <div className="flex-1">
                            <Label htmlFor="drawer_percentage" className="cursor-pointer">
                              Fixed Percentage Discount
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Apply a fixed discount percentage to all items
                            </Text>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="code_mapping" id="drawer_code_mapping" />
                          <div className="flex-1">
                            <Label htmlFor="drawer_code_mapping" className="cursor-pointer">
                              Discount Codes
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Map supplier discount codes to percentage values
                            </Text>
                          </div>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>

                {/* Description Field */}
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="description"
                        placeholder="e.g., Caterpillar discount code structure"
                      />
                    )}
                  />
                </div>

                {/* Percentage Input (for percentage type) */}
                {discountType === "percentage" && (
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="default_percentage">Default Discount Percentage</Label>
                    <Controller
                      name="default_percentage"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-y-1">
                          <div className="flex items-center gap-2">
                            <Input
                              {...field}
                              id="default_percentage"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="20"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              className="max-w-[200px]"
                            />
                            <Text size="small" className="text-ui-fg-subtle">%</Text>
                          </div>
                          {fieldState.error && (
                            <Text size="xsmall" className="text-ui-fg-error">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                  </div>
                )}

                {/* Code Mappings (for code_mapping type) */}
                {discountType === "code_mapping" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Discount Code Mappings</Label>
                      <Tooltip content="Map supplier discount codes to percentage values">
                        <InformationCircleSolid className="text-ui-fg-subtle" />
                      </Tooltip>
                    </div>

                    <div className="space-y-2">
                      {codeMappings.map((mapping, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <div>
                            <Label htmlFor={`code_${index}`} className="text-xs">Code</Label>
                            <Input
                              id={`code_${index}`}
                              type="text"
                              placeholder="A"
                              value={mapping.code}
                              onChange={(e) => handleCodeChange(index, e.target.value)}
                              className="uppercase"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`percentage_${index}`} className="text-xs">Percentage</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                id={`percentage_${index}`}
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
                          </div>
                          <div className="flex items-end pb-1">
                            <IconButton
                              variant="transparent"
                              onClick={() => handleRemoveCodeMapping(index)}
                              disabled={codeMappings.length === 1}
                              type="button"
                            >
                              <Trash className="text-ui-fg-subtle" />
                            </IconButton>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleAddCodeMapping}
                      type="button"
                    >
                      <Plus />
                      Add Code
                    </Button>
                  </div>
                )}
              </Drawer.Body>

              <Drawer.Footer>
                <div className="flex justify-end gap-2">
                  <Drawer.Close asChild>
                    <Button variant="secondary" type="button">
                      Cancel
                    </Button>
                  </Drawer.Close>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    isLoading={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </Drawer.Footer>
            </form>
          </FormProvider>
        </Drawer.Content>
      </Drawer>
    </>
  )
}
