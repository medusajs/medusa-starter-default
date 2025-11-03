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
  Select,
  Input,
  Label,
  Text,
  toast,
  Drawer,
} from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { IMPORT_TEMPLATES } from "../../../../lib/import-templates"

type PricingMode = "net_only" | "calculated" | "percentage" | "code_mapping"
type ParsingMethod = "template" | "delimited" | "fixed-width"

interface ImportDefaults {
  pricing_mode: PricingMode
  parsing_method: ParsingMethod
  template_id?: string
  delimiter?: string
}

interface SupplierImportDefaultsSectionProps {
  supplier: any
}

// Validation schema
const importDefaultsSchema = zod.object({
  pricing_mode: zod.enum(["net_only", "calculated", "percentage", "code_mapping"]),
  parsing_method: zod.enum(["template", "delimited", "fixed-width"]),
  template_id: zod.string().optional(),
  delimiter: zod.string().optional(),
})

type ImportDefaultsFormData = zod.infer<typeof importDefaultsSchema>

export const SupplierImportDefaultsSection = ({
  supplier,
}: SupplierImportDefaultsSectionProps) => {
  const queryClient = useQueryClient()
  const [showEditDrawer, setShowEditDrawer] = useState(false)
  const [customDelimiter, setCustomDelimiter] = useState("")

  // Get current configuration from supplier metadata
  const currentDefaults: ImportDefaults = supplier?.metadata?.import_defaults || {
    pricing_mode: supplier?.metadata?.discount_structure?.type || "net_only",
    parsing_method: "delimited",
    delimiter: ",",
  }

  const discountStructureType = supplier?.metadata?.discount_structure?.type

  const form = useForm<ImportDefaultsFormData>({
    resolver: zodResolver(importDefaultsSchema),
    defaultValues: {
      pricing_mode: currentDefaults.pricing_mode,
      parsing_method: currentDefaults.parsing_method,
      template_id: currentDefaults.template_id || "",
      delimiter: currentDefaults.delimiter || ",",
    },
  })

  const parsingMethod = form.watch("parsing_method")
  const delimiter = form.watch("delimiter")

  const standardDelimiters = [",", ";", "\t", "|"]
  const isCustomDelimiter = delimiter && !standardDelimiters.includes(delimiter)

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ImportDefaultsFormData) => {
      const response = await fetch(
        `/admin/suppliers/${supplier.id}/import-defaults`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save import defaults")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", supplier.id] })
      setShowEditDrawer(false)
      toast.success("Import defaults saved", {
        description: "Configuration updated successfully",
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
      pricing_mode: currentDefaults.pricing_mode,
      parsing_method: currentDefaults.parsing_method,
      template_id: currentDefaults.template_id || "",
      delimiter: currentDefaults.delimiter || ",",
    })

    setCustomDelimiter("")
    setShowEditDrawer(true)
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    // Validate template mode
    if (data.parsing_method === "template" && !data.template_id) {
      toast.error("Template required", {
        description: "Please select a template",
      })
      return
    }

    // Validate delimited mode
    if (data.parsing_method === "delimited") {
      const finalDelimiter = isCustomDelimiter ? customDelimiter : data.delimiter
      if (!finalDelimiter) {
        toast.error("Delimiter required", {
          description: "Please select or enter a delimiter",
        })
        return
      }
      data.delimiter = finalDelimiter
    }

    updateMutation.mutate(data)
  })

  // Helper functions for display
  const getPricingModeLabel = (mode: PricingMode) => {
    switch (mode) {
      case "net_only":
        return "Net Price Only"
      case "calculated":
        return "Pre-calculated (Gross + Net)"
      case "percentage":
        return "Fixed Percentage Discount"
      case "code_mapping":
        return "Discount Codes"
      default:
        return mode
    }
  }

  const getParsingMethodLabel = (method: ParsingMethod) => {
    switch (method) {
      case "template":
        return "Template"
      case "delimited":
        return "Delimited (CSV)"
      case "fixed-width":
        return "Fixed-Width"
      default:
        return method
    }
  }

  const getDelimiterLabel = (delim?: string) => {
    if (!delim) return "None"
    switch (delim) {
      case ",":
        return "Comma (,)"
      case ";":
        return "Semicolon (;)"
      case "\t":
        return "Tab"
      case "|":
        return "Pipe (|)"
      default:
        return `Custom (${delim})`
    }
  }

  const templates = Object.values(IMPORT_TEMPLATES)

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Import Defaults</Heading>
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
                Default Pricing Mode
              </Text>
              <Text className="font-medium mb-1">
                {getPricingModeLabel(currentDefaults.pricing_mode)}
              </Text>
              {discountStructureType && (
                <Text size="xsmall" className="text-ui-fg-muted">
                  Auto-filled from discount structure
                </Text>
              )}
            </div>

            <div>
              <Text size="small" className="text-ui-fg-subtle mb-1">
                Parsing Method
              </Text>
              <Text className="font-medium">
                {getParsingMethodLabel(currentDefaults.parsing_method)}
              </Text>
            </div>

            {currentDefaults.parsing_method === "template" && currentDefaults.template_id && (
              <div>
                <Text size="small" className="text-ui-fg-subtle mb-1">
                  Template
                </Text>
                <Text className="font-medium">
                  {IMPORT_TEMPLATES[currentDefaults.template_id]?.name || currentDefaults.template_id}
                </Text>
              </div>
            )}

            {currentDefaults.parsing_method === "delimited" && currentDefaults.delimiter && (
              <div>
                <Text size="small" className="text-ui-fg-subtle mb-1">
                  Delimiter
                </Text>
                <Text className="font-medium">
                  {getDelimiterLabel(currentDefaults.delimiter)}
                </Text>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Text size="xsmall" className="text-ui-fg-muted">
              These settings pre-populate the import wizard for faster repeat imports
            </Text>
          </div>
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
                <Drawer.Title>Edit Import Defaults</Drawer.Title>
                <Drawer.Description>
                  Configure default settings to pre-populate the import wizard
                </Drawer.Description>
              </Drawer.Header>

              <Drawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
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
                  <Controller
                    name="pricing_mode"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        <div className="flex items-center gap-2">
                          <RadioGroup.Item value="net_only" id="pm_net_only" />
                          <Label htmlFor="pm_net_only" className="cursor-pointer">
                            Net Price Only
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <RadioGroup.Item value="calculated" id="pm_calculated" />
                          <Label htmlFor="pm_calculated" className="cursor-pointer">
                            Pre-calculated (Gross + Net)
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <RadioGroup.Item value="percentage" id="pm_percentage" />
                          <Label htmlFor="pm_percentage" className="cursor-pointer">
                            Fixed Percentage Discount
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <RadioGroup.Item value="code_mapping" id="pm_code_mapping" />
                          <Label htmlFor="pm_code_mapping" className="cursor-pointer">
                            Discount Codes
                          </Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>

                {/* Parsing Method */}
                <div className="space-y-4">
                  <Label>Default Parsing Method</Label>
                  <Controller
                    name="parsing_method"
                    control={form.control}
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="template" id="parse_template" />
                          <div className="flex-1">
                            <Label htmlFor="parse_template" className="cursor-pointer">
                              Template
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Use a predefined template for this supplier's format
                            </Text>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="delimited" id="parse_delimited" />
                          <div className="flex-1">
                            <Label htmlFor="parse_delimited" className="cursor-pointer">
                              Delimited (CSV)
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Parse CSV or other delimited files
                            </Text>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <RadioGroup.Item value="fixed-width" id="parse_fixed" />
                          <div className="flex-1">
                            <Label htmlFor="parse_fixed" className="cursor-pointer">
                              Fixed-Width
                            </Label>
                            <Text size="small" className="text-ui-fg-subtle">
                              Parse fixed-width text files with column positions
                            </Text>
                          </div>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>

                {/* Template Selection (for template mode) */}
                {parsingMethod === "template" && (
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="template_id">Select Template</Label>
                    <Controller
                      name="template_id"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <Select.Trigger id="template_id">
                            <Select.Value placeholder="Choose a template" />
                          </Select.Trigger>
                          <Select.Content>
                            {templates.map((template) => (
                              <Select.Item key={template.id} value={template.id}>
                                {template.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      )}
                    />
                  </div>
                )}

                {/* Delimiter Selection (for delimited mode) */}
                {parsingMethod === "delimited" && (
                  <div className="space-y-3">
                    <Label>Delimiter</Label>
                    <Controller
                      name="delimiter"
                      control={form.control}
                      render={({ field }) => (
                        <RadioGroup
                          value={isCustomDelimiter ? "custom" : field.value}
                          onValueChange={(value) => {
                            if (value === "custom") {
                              field.onChange("")
                            } else {
                              field.onChange(value)
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroup.Item value="," id="delim_comma" />
                            <Label htmlFor="delim_comma" className="cursor-pointer">
                              Comma (,)
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <RadioGroup.Item value=";" id="delim_semicolon" />
                            <Label htmlFor="delim_semicolon" className="cursor-pointer">
                              Semicolon (;)
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <RadioGroup.Item value="\t" id="delim_tab" />
                            <Label htmlFor="delim_tab" className="cursor-pointer">
                              Tab
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <RadioGroup.Item value="|" id="delim_pipe" />
                            <Label htmlFor="delim_pipe" className="cursor-pointer">
                              Pipe (|)
                            </Label>
                          </div>

                          <div className="flex items-start gap-2">
                            <RadioGroup.Item value="custom" id="delim_custom" />
                            <div className="flex-1">
                              <Label htmlFor="delim_custom" className="cursor-pointer mb-2">
                                Custom
                              </Label>
                              {(isCustomDelimiter || !field.value) && (
                                <Input
                                  type="text"
                                  placeholder="Enter delimiter"
                                  value={customDelimiter}
                                  onChange={(e) => {
                                    setCustomDelimiter(e.target.value)
                                    field.onChange(e.target.value)
                                  }}
                                  maxLength={1}
                                  className="max-w-[200px]"
                                />
                              )}
                            </div>
                          </div>
                        </RadioGroup>
                      )}
                    />
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
