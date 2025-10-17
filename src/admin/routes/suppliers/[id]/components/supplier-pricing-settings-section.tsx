import { useState } from "react"
import { PencilSquare } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Switch,
  Input,
  Label,
  Button,
  toast,
  Drawer,
} from "@medusajs/ui"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"

const pricingSettingsSchema = zod.object({
  is_pricing_source: zod.boolean(),
  auto_sync_prices: zod.boolean(),
  pricing_priority: zod.number().min(0, "Priority must be 0 or greater").max(999, "Priority cannot exceed 999"),
})

type PricingSettingsFormData = zod.infer<typeof pricingSettingsSchema>

interface Supplier {
  id: string
  name: string
  is_pricing_source?: boolean
  auto_sync_prices?: boolean
  pricing_priority?: number
}

interface SupplierPricingSettingsSectionProps {
  supplier: Supplier
}

export const SupplierPricingSettingsSection = ({
  supplier,
}: SupplierPricingSettingsSectionProps) => {
  const queryClient = useQueryClient()
  const [showEditDrawer, setShowEditDrawer] = useState(false)

  const form = useForm<PricingSettingsFormData>({
    resolver: zodResolver(pricingSettingsSchema),
    defaultValues: {
      is_pricing_source: supplier.is_pricing_source || false,
      auto_sync_prices: supplier.auto_sync_prices || false,
      pricing_priority: supplier.pricing_priority || 0,
    },
  })

  const isPricingSourceValue = form.watch("is_pricing_source")

  const updatePricingSettingsMutation = useMutation({
    mutationFn: async (data: PricingSettingsFormData) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", supplier.id] })
      setShowEditDrawer(false)
      toast.success("Pricing settings updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update pricing settings: ${error.message}`)
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    updatePricingSettingsMutation.mutate(data)
  })

  const handleEditClick = () => {
    form.reset({
      is_pricing_source: supplier.is_pricing_source || false,
      auto_sync_prices: supplier.auto_sync_prices || false,
      pricing_priority: supplier.pricing_priority || 0,
    })
    setShowEditDrawer(true)
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Pricing Configuration</Heading>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle">
                Use as Pricing Source
              </Text>
              <Text className="font-medium">
                {supplier.is_pricing_source ? "Yes" : "No"}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                {supplier.is_pricing_source
                  ? "This supplier's prices will sync to product variants"
                  : "This supplier is not used as a pricing source"}
              </Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">
                Auto-Sync Prices
              </Text>
              <Text className="font-medium">
                {supplier.auto_sync_prices ? "Enabled" : "Disabled"}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                {supplier.auto_sync_prices
                  ? "Prices sync automatically on upload"
                  : "Manual sync required after upload"}
              </Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">
                Pricing Priority
              </Text>
              <Text className="font-medium">
                {supplier.pricing_priority || 0}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                Higher number = higher priority for conflicts
              </Text>
            </div>
          </div>
        </div>
      </Container>

      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Pricing Configuration</Drawer.Title>
            <Drawer.Description>
              Configure how this supplier's prices sync to product variants
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="is_pricing_source">Use as Pricing Source</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-1">
                      Enable this supplier as a pricing source for product variants
                    </Text>
                  </div>
                  <Controller
                    name="is_pricing_source"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="is_pricing_source"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="auto_sync_prices">Auto-Sync Prices</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-1">
                      Automatically sync prices to variants when price list is uploaded
                    </Text>
                  </div>
                  <Controller
                    name="auto_sync_prices"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="auto_sync_prices"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isPricingSourceValue}
                      />
                    )}
                  />
                </div>
                {!isPricingSourceValue && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Enable "Use as Pricing Source" to use auto-sync
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-y-2">
                <Label htmlFor="pricing_priority">Pricing Priority (0-999)</Label>
                <Text size="small" className="text-ui-fg-subtle">
                  When multiple suppliers provide the same product, higher priority suppliers take precedence
                </Text>
                <Controller
                  name="pricing_priority"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-y-1">
                      <Input
                        {...field}
                        id="pricing_priority"
                        type="number"
                        min="0"
                        max="999"
                        placeholder="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={!isPricingSourceValue}
                      />
                      {fieldState.error && (
                        <Text size="xsmall" className="text-ui-fg-error">
                          {fieldState.error.message}
                        </Text>
                      )}
                    </div>
                  )}
                />
                {!isPricingSourceValue && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Enable "Use as Pricing Source" to set priority
                  </Text>
                )}
              </div>
            </form>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditDrawer(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updatePricingSettingsMutation.isPending}
                isLoading={updatePricingSettingsMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  )
}
