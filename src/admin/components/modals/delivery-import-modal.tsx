import {
  FocusModal,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Text,
  toast,
  Badge,
} from "@medusajs/ui"
import { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircleSolid, XCircle } from "@medusajs/icons"

interface DeliveryImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrderId: string
}

export const DeliveryImportModal = ({
  open,
  onOpenChange,
  purchaseOrderId,
}: DeliveryImportModalProps) => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [deliveryNumber, setDeliveryNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [importResult, setImportResult] = useState<any>(null)

  const importMutation = useMutation({
    mutationFn: async (data: {
      file_content: string
      delivery_number?: string
      notes?: string
      import_filename?: string
    }) => {
      const response = await fetch(
        `/admin/purchase-orders/${purchaseOrderId}/import-delivery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to import delivery")
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order", purchaseOrderId],
      })
      setImportResult(data)
      toast.success("Delivery imported successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to import delivery: ${error.message}`)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setFileContent(content)
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!fileContent) {
      toast.error("Please select a file to import")
      return
    }

    importMutation.mutate({
      file_content: fileContent,
      delivery_number: deliveryNumber || undefined,
      notes: notes || undefined,
      import_filename: file?.name,
    })
  }

  const handleClose = () => {
    setFile(null)
    setFileContent("")
    setDeliveryNumber("")
    setNotes("")
    setImportResult(null)
    onOpenChange(false)
  }

  return (
    <FocusModal open={open} onOpenChange={handleClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading level="h2">Import Delivery Note</Heading>
        </FocusModal.Header>

        <FocusModal.Body>
          <div className="flex flex-col items-center p-8">
            <div className="w-full max-w-2xl">
              {!importResult ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <Label size="small" weight="plus">
                      Delivery Note (CSV)
                    </Label>
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                        {file && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {file.name}
                          </Text>
                        )}
                      </div>
                      <Text size="xsmall" className="mt-1 text-ui-fg-subtle">
                        CSV format: SKU,Quantity[,Notes]
                      </Text>
                    </div>
                  </div>

                  {/* Delivery Number */}
                  <div>
                    <Label size="small" weight="plus">
                      Delivery Number (Optional)
                    </Label>
                    <Input
                      placeholder="e.g., DN-2025-001"
                      value={deliveryNumber}
                      onChange={(e) => setDeliveryNumber(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label size="small" weight="plus">
                      Notes (Optional)
                    </Label>
                    <Textarea
                      placeholder="Any notes about this delivery..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleClose}
                      disabled={importMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!fileContent || importMutation.isPending}
                      isLoading={importMutation.isPending}
                    >
                      Import Delivery
                    </Button>
                  </div>
                </form>
              ) : (
                /* Import Result */
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircleSolid className="text-green-600" />
                      <div>
                        <Text weight="plus" className="text-green-900">
                          Delivery Imported Successfully
                        </Text>
                        <Text size="small" className="mt-1 text-green-700">
                          {importResult.matched_items?.length || 0} items
                          matched and updated
                        </Text>
                      </div>
                    </div>
                  </div>

                  {/* Matched Items */}
                  {importResult.matched_items?.length > 0 && (
                    <div>
                      <Heading level="h3" className="mb-3">
                        Matched Items ({importResult.matched_items.length})
                      </Heading>
                      <div className="space-y-2">
                        {importResult.matched_items.map((item: any) => (
                          <div
                            key={item.purchase_order_item_id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <Text size="small" weight="plus">
                                {item.product_title}
                              </Text>
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                SKU: {item.sku}
                              </Text>
                            </div>
                            <Badge color="green">
                              +{item.quantity_delivered} received
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unmatched Items */}
                  {importResult.unmatched_items?.length > 0 && (
                    <div>
                      <Heading level="h3" className="mb-3">
                        Unmatched Items ({importResult.unmatched_items.length})
                      </Heading>
                      <div className="space-y-2">
                        {importResult.unmatched_items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3"
                          >
                            <div>
                              <Text size="small" weight="plus">
                                SKU: {item.sku}
                              </Text>
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                {item.reason}
                              </Text>
                            </div>
                            <Badge color="orange">
                              {item.quantity_delivered} items
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Backorders */}
                  {importResult.total_backorder_count > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <Text weight="plus" className="text-blue-900">
                        Outstanding Backorders: {importResult.total_backorder_count}{" "}
                        items
                      </Text>
                      <Text size="small" className="mt-1 text-blue-700">
                        Some items are still awaiting delivery
                      </Text>
                    </div>
                  )}

                  {/* Close Button */}
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleClose}>Done</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
