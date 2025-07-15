import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { 
  Container, 
  Heading, 
  Button, 
  Badge,
  Table,
  Text,
  toast,
  FocusModal,
  Input,
  Select,
  Textarea,
  Label,
  DropdownMenu,
} from "@medusajs/ui"
import { Plus, DocumentText, ChevronDown, ChevronUpMini, ArrowUpTray } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PriceListUpload } from "./price-list-upload"

interface PriceList {
  id: string
  name: string
  description?: string
  supplier_id: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  is_active: boolean
  upload_filename?: string
  items_count?: number
  created_at: Date
  updated_at: Date
}

interface PriceListItem {
  id: string
  price_list_id: string
  product_id: string
  product_variant_id: string
  supplier_sku?: string
  variant_sku?: string
  cost_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface Supplier {
  id: string
  name: string
}

interface SupplierPriceListsProps {
  data: Supplier
}

export const SupplierPriceLists = ({ data: supplier }: SupplierPriceListsProps) => {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [expandedPriceLists, setExpandedPriceLists] = useState<Set<string>>(new Set())

  const { data: priceListsData, isLoading, error } = useQuery({
    queryKey: ["supplier-price-lists", supplier?.id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists?include_items=true`)
      if (!response.ok) {
        throw new Error(`Failed to fetch price lists: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!supplier?.id,
  })

  const createPriceListMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists`, {
        method: "POST",
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
      queryClient.invalidateQueries({ queryKey: ["supplier-price-lists", supplier.id] })
      setShowCreateModal(false)
      toast.success("Price list created successfully")
    },
    onError: (error) => {
      toast.error(`Failed to create price list: ${error.message}`)
    }
  })

  const deletePriceListMutation = useMutation({
    mutationFn: async (priceListId: string) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceListId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete price list")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-lists", supplier.id] })
      toast.success("Price list deleted successfully")
    },
    onError: (error) => {
      toast.error(`Failed to delete price list: ${error.message}`)
    }
  })

  const togglePriceList = (priceListId: string) => {
    const newExpanded = new Set(expandedPriceLists)
    if (newExpanded.has(priceListId)) {
      newExpanded.delete(priceListId)
    } else {
      newExpanded.add(priceListId)
    }
    setExpandedPriceLists(newExpanded)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  if (!supplier?.id) {
    return null
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Price Lists</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-error">Failed to load price lists</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {error.message}
          </Text>
        </div>
      </Container>
    )
  }

  const priceLists = priceListsData?.price_lists || []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Price Lists</Heading>
            {priceLists.length > 0 && (
              <Text size="small" className="text-ui-fg-subtle mt-1">
                {priceLists.length} price list{priceLists.length !== 1 ? 's' : ''} available
              </Text>
            )}
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="small">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Price List
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Manually
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setShowUploadModal(true)}>
                  <ArrowUpTray className="w-4 h-4 mr-2" />
                  Upload CSV
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="px-6 py-8 text-center">
          <Text>Loading price lists...</Text>
        </div>
      )}

      {!isLoading && priceLists.length === 0 && (
        <div className="px-6 py-8 text-center">
          <DocumentText className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
          <Text className="text-ui-fg-muted mb-2">No price lists found</Text>
          <Text size="small" className="text-ui-fg-subtle mb-4">
            Create your first price list to manage supplier pricing
          </Text>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Price List
            </Button>
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              <ArrowUpTray className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
          </div>
        </div>
      )}

      {priceLists.map((priceList: PriceList) => (
        <div key={priceList.id} className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="transparent"
                size="small"
                onClick={() => togglePriceList(priceList.id)}
              >
                {expandedPriceLists.has(priceList.id) ? (
                  <ChevronUpMini className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
              <div>
                <Heading level="h3" className="mb-1">
                  {priceList.name}
                </Heading>
                <div className="flex items-center gap-2">
                  <Badge color={priceList.is_active ? "green" : "red"} size="2xsmall">
                    {priceList.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Text size="small" className="text-ui-fg-subtle">
                    {priceList.items_count || 0} items
                  </Text>
                  {priceList.currency_code && (
                    <Text size="small" className="text-ui-fg-subtle">
                      {priceList.currency_code}
                    </Text>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  toast.info("Edit functionality coming soon")
                }}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this price list?")) {
                    deletePriceListMutation.mutate(priceList.id)
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>

          {priceList.description && (
            <Text size="small" className="text-ui-fg-subtle mb-4">
              {priceList.description}
            </Text>
          )}

          <div className="flex gap-4 text-sm text-ui-fg-subtle mb-4">
            {priceList.effective_date && (
              <Text size="small">
                Effective: {formatDate(priceList.effective_date)}
              </Text>
            )}
            {priceList.expiry_date && (
              <Text size="small">
                Expires: {formatDate(priceList.expiry_date)}
              </Text>
            )}
          </div>

          {expandedPriceLists.has(priceList.id) && (
            <PriceListItemsTable
              priceList={priceList}
              supplier={supplier}
              formatPrice={formatPrice}
            />
          )}
        </div>
      ))}

      <CreatePriceListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createPriceListMutation.mutate(data)}
        isLoading={createPriceListMutation.isPending}
      />

      <FocusModal open={showUploadModal} onOpenChange={setShowUploadModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-end">
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <PriceListUpload
              supplierId={supplier.id}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["supplier-price-lists", supplier.id] })
                setShowUploadModal(false)
              }}
            />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

interface PriceListItemsTableProps {
  priceList: PriceList
  supplier: Supplier
  formatPrice: (price: number) => string
}

const PriceListItemsTable = ({ priceList, supplier, formatPrice }: PriceListItemsTableProps) => {
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ["price-list-items", priceList.id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceList.id}/items`)
      if (!response.ok) {
        throw new Error("Failed to fetch price list items")
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="mt-4">
        <Text>Loading items...</Text>
      </div>
    )
  }

  const items = itemsData?.items || []

  if (items.length === 0) {
    return (
      <div className="mt-4 text-center py-4 border border-ui-border-base rounded-lg">
        <Text className="text-ui-fg-muted">No items in this price list</Text>
        <Button
          size="small"
          variant="secondary"
          className="mt-2"
          onClick={() => {
            toast.info("Add item functionality coming soon")
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <Text weight="plus">Items ({items.length})</Text>
        <Button
          size="small"
          variant="secondary"
          onClick={() => {
            toast.info("Add item functionality coming soon")
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>
      
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Supplier SKU</Table.HeaderCell>
            <Table.HeaderCell>Variant SKU</Table.HeaderCell>
            <Table.HeaderCell>Cost Price</Table.HeaderCell>
            <Table.HeaderCell>Min Qty</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((item: PriceListItem) => (
            <Table.Row key={item.id}>
              <Table.Cell>
                <Text>{item.supplier_sku || "N/A"}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{item.variant_sku || "N/A"}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{formatPrice(item.cost_price)}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{item.quantity || 1}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={item.is_active ? "green" : "red"} size="2xsmall">
                  {item.is_active ? "Active" : "Inactive"}
                </Badge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

interface CreatePriceListModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isLoading: boolean
}

const CreatePriceListModal = ({ isOpen, onClose, onSubmit, isLoading }: CreatePriceListModalProps) => {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      description: "",
      effective_date: "",
      expiry_date: "",
      currency_code: "USD",
      items: []
    }
  })

  const onSubmitHandler = (data: any) => {
    const processedData = {
      ...data,
      effective_date: data.effective_date || undefined,
      expiry_date: data.expiry_date || undefined,
      items: data.items || []
    }
    onSubmit(processedData)
    reset()
  }

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-end">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <div className="flex flex-col items-center p-16">
            <div className="w-full max-w-lg">
              <div className="mb-8 text-center">
                <Heading level="h2" className="mb-2">Create Price List</Heading>
                <Text className="text-ui-fg-subtle">
                  Create a new price list for this supplier
                </Text>
              </div>

              <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Price List Name"
                    {...register("name", { required: "Name is required" })}
                  />
                  {errors.name && (
                    <Text size="small" className="text-ui-fg-error mt-1">
                      {errors.name.message}
                    </Text>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description"
                    {...register("description")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="effective_date">Effective Date</Label>
                    <Input
                      id="effective_date"
                      type="date"
                      {...register("effective_date")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      {...register("expiry_date")}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="currency_code">Currency</Label>
                  <Controller
                    name="currency_code"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select currency" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="USD">USD</Select.Item>
                          <Select.Item value="EUR">EUR</Select.Item>
                          <Select.Item value="GBP">GBP</Select.Item>
                          <Select.Item value="CAD">CAD</Select.Item>
                        </Select.Content>
                      </Select>
                    )}
                  />
                </div>

                <div className="bg-ui-bg-subtle p-4 rounded-lg">
                  <Text size="small" className="text-ui-fg-subtle">
                    You can add items to this price list after creation, or upload a CSV file with pricing data.
                  </Text>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Price List"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

export default SupplierPriceLists