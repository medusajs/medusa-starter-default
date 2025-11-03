import { Container, Badge, Text, Heading, Button, Input, Table, FocusModal, Select, Textarea, Label } from "@medusajs/ui"
import { Plus, ArrowUpTray, ArrowDownTray, Clock, PencilSquare, Trash } from "@medusajs/icons"
import { useState, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"

type PriceListItem = {
  id: string
  product_variant_id: string
  product_id: string
  variant_sku?: string
  cost_price: number
  quantity: number
  notes?: string
  created_at: string
  updated_at: string
}

type PriceList = {
  id: string
  name: string
  description?: string
  version: number
  is_active: boolean
  currency_code: string
  items_count: number
  upload_filename?: string
  brand_id?: string
  brand?: {
    id: string
    name: string
    code: string
  }
  created_at: string
  updated_at: string
}

type SupplierPriceListWidgetProps = {
  supplierId: string
  priceList: PriceList | null
  items: PriceListItem[]
  onUploadCSV: (file: File) => Promise<void>
  onAddItem: (item: Omit<PriceListItem, "id" | "created_at" | "updated_at">) => Promise<void>
  onUpdateItem: (id: string, item: Partial<PriceListItem>) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onDownloadTemplate: () => void
  onViewHistory: () => void
}

const addItemSchema = zod.object({
  product_variant_id: zod.string().min(1, "Product variant ID is required"),
  product_id: zod.string().min(1, "Product ID is required"),
  variant_sku: zod.string().optional(),
  cost_price: zod.number().min(0, "Cost price must be 0 or greater"),
  quantity: zod.number().min(1, "Quantity must be at least 1").default(1),
  notes: zod.string().optional()
})

type AddItemFormData = zod.infer<typeof addItemSchema>

const SupplierPriceListWidget = ({ 
  supplierId, 
  priceList, 
  items, 
  onUploadCSV, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem, 
  onDownloadTemplate, 
  onViewHistory 
}: SupplierPriceListWidgetProps) => {
  const [isEditingItem, setIsEditingItem] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingItem, setEditingItem] = useState<Partial<PriceListItem>>({})
  
  const addItemForm = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      product_variant_id: "",
      product_id: "",
      variant_sku: "",
      cost_price: 0,
      quantity: 1,
      notes: ""
    }
  })

  const handleAddItem = addItemForm.handleSubmit(async (data) => {
    try {
      await onAddItem(data)
      addItemForm.reset()
      setIsAddItemModalOpen(false)
    } catch (error) {
      console.error("Error adding item:", error)
    }
  })

  const handleUpdateItem = async (id: string) => {
    try {
      await onUpdateItem(id, editingItem)
      setIsEditingItem(null)
      setEditingItem({})
    } catch (error) {
      console.error("Error updating item:", error)
    }
  }

  const handleUploadCSV = async () => {
    if (!uploadFile) return
    
    try {
      await onUploadCSV(uploadFile)
      setUploadFile(null)
      setIsUploadingCSV(false)
    } catch (error) {
      console.error("Error uploading CSV:", error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  const startEditItem = (item: PriceListItem) => {
    setEditingItem(item)
    setIsEditingItem(item.id)
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heading level="h2">Price List</Heading>
          {priceList && (
            <>
              <Badge variant="blue">
                Version {priceList.version} • {priceList.items_count} items
              </Badge>
              {priceList.brand && (
                <Badge variant="grey">
                  {priceList.brand.name} ({priceList.brand.code})
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="small" onClick={onDownloadTemplate}>
            <ArrowDownTray />
            Template
          </Button>
          <Button variant="secondary" size="small" onClick={onViewHistory}>
            <Clock />
            History
          </Button>
        </div>
      </div>

      {priceList && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Text className="font-medium text-gray-600 mb-1">Name</Text>
              <Text>{priceList.name}</Text>
            </div>
            <div>
              <Text className="font-medium text-gray-600 mb-1">Currency</Text>
              <Text>{priceList.currency_code}</Text>
            </div>
            <div>
              <Text className="font-medium text-gray-600 mb-1">Last Updated</Text>
              <Text>{new Date(priceList.updated_at).toLocaleDateString()}</Text>
            </div>
            {priceList.brand && (
              <div>
                <Text className="font-medium text-gray-600 mb-1">Brand</Text>
                <Text>{priceList.brand.name} ({priceList.brand.code})</Text>
              </div>
            )}
            {priceList.upload_filename && (
              <div>
                <Text className="font-medium text-gray-600 mb-1">Last Upload</Text>
                <Text>{priceList.upload_filename}</Text>
              </div>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Text className="text-gray-500">No price list items found</Text>
          <Text className="text-sm text-gray-400 mt-2">
            Add items manually or upload a CSV file to get started
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Product SKU</Table.HeaderCell>
              <Table.HeaderCell>Cost Price</Table.HeaderCell>
              <Table.HeaderCell>Quantity</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <Text className="font-mono text-sm">{item.variant_sku || "—"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="font-medium">
                    {priceList?.currency_code || "USD"} {item.cost_price.toFixed(2)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text>{item.quantity}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="small" onClick={() => startEditItem(item)}>
                      <PencilSquare />
                    </Button>
                    <Button variant="danger" size="small" onClick={() => onDeleteItem(item.id)}>
                      <Trash />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Add Item Modal */}
      <FocusModal open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
        <FocusModal.Trigger asChild>
          <Button variant="primary" size="small">
            <Plus />
            Add Item
          </Button>
        </FocusModal.Trigger>
        <FocusModal.Content>
          <form onSubmit={handleAddItem}>
            <FocusModal.Header>
              <Heading level="h3">Add Price List Item</Heading>
            </FocusModal.Header>
            <FocusModal.Body className="flex flex-col gap-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="product_variant_id">Product Variant ID *</Label>
                  <Controller
                    name="product_variant_id"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="product_variant_id"
                          placeholder="Enter product variant ID"
                          size="small"
                        />
                        {fieldState.error && (
                          <Text size="xsmall" className="text-ui-fg-error">
                            {fieldState.error.message}
                          </Text>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="product_id">Product ID *</Label>
                  <Controller
                    name="product_id"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="product_id"
                          placeholder="Enter product ID"
                          size="small"
                        />
                        {fieldState.error && (
                          <Text size="xsmall" className="text-ui-fg-error">
                            {fieldState.error.message}
                          </Text>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="variant_sku">Variant SKU</Label>
                  <Controller
                    name="variant_sku"
                    control={addItemForm.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="variant_sku"
                        placeholder="Enter variant SKU"
                        size="small"
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="cost_price">Cost Price *</Label>
                  <Controller
                    name="cost_price"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="cost_price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          size="small"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        {fieldState.error && (
                          <Text size="xsmall" className="text-ui-fg-error">
                            {fieldState.error.message}
                          </Text>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Controller
                    name="quantity"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="quantity"
                          type="number"
                          min="1"
                          placeholder="1"
                          size="small"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                        {fieldState.error && (
                          <Text size="xsmall" className="text-ui-fg-error">
                            {fieldState.error.message}
                          </Text>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Controller
                    name="notes"
                    control={addItemForm.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="notes"
                        rows={3}
                        placeholder="Additional notes..."
                      />
                    )}
                  />
                </div>
              </div>
            </FocusModal.Body>
            <FocusModal.Footer>
              <div className="flex items-center gap-x-2">
                <FocusModal.Close asChild>
                  <Button 
                    variant="secondary" 
                    size="small"
                    type="button"
                    onClick={() => {
                      addItemForm.reset()
                    }}
                  >
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button 
                  variant="primary" 
                  size="small"
                  type="submit"
                  disabled={!addItemForm.formState.isValid}
                >
                  Add Item
                </Button>
              </div>
            </FocusModal.Footer>
          </form>
        </FocusModal.Content>
      </FocusModal>

      {/* CSV Upload Modal */}
      <FocusModal open={isUploadingCSV} onOpenChange={setIsUploadingCSV}>
        <FocusModal.Trigger asChild>
          <Button variant="secondary" size="small">
            <ArrowUpTray />
            Upload CSV
          </Button>
        </FocusModal.Trigger>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading level="h3">Upload Price List CSV</Heading>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="space-y-4">
              <div>
                <Text className="text-sm text-gray-600 mb-4">
                  Upload a CSV file to overwrite existing prices. This will replace all current price list items.
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {uploadFile && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Text className="text-sm">Selected file: {uploadFile.name}</Text>
                  <Text className="text-xs text-gray-500">Size: {(uploadFile.size / 1024).toFixed(1)} KB</Text>
                </div>
              )}
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <FocusModal.Close asChild>
              <Button variant="secondary">
                Cancel
              </Button>
            </FocusModal.Close>
            <Button variant="primary" onClick={handleUploadCSV} disabled={!uploadFile}>
              Upload & Replace
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default SupplierPriceListWidget