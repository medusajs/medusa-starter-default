import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ExclamationCircle, Plus } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"

interface BackordersWidgetProps {
  purchaseOrderId: string
  purchaseOrderNumber: string
}

interface BackorderItem {
  purchase_order_item_id: string
  product_variant_id: string
  product_title: string
  product_variant_title?: string
  product_sku?: string
  quantity_ordered: number
  quantity_received: number
  backorder_quantity: number
  unit_cost: number
}

const useBackorders = (purchaseOrderId: string) => {
  return useQuery({
    queryKey: ["purchase-order-backorders", purchaseOrderId],
    queryFn: async () => {
      const response = await fetch(
        `/admin/purchase-orders/${purchaseOrderId}/backorders`
      )
      if (!response.ok) throw new Error("Failed to fetch backorders")
      const data = await response.json()
      return {
        backorder_items: data.backorder_items as BackorderItem[],
        total_backorder_count: data.total_backorder_count as number,
      }
    },
  })
}

export const BackordersWidget = ({
  purchaseOrderId,
  purchaseOrderNumber,
}: BackordersWidgetProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirmDialog = usePrompt()
  const { data, isLoading } = useBackorders(purchaseOrderId)

  const createBackorderPOMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/admin/purchase-orders/${purchaseOrderId}/create-backorder-po`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )
      if (!response.ok) throw new Error("Failed to create backorder PO")
      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-backorders", purchaseOrderId],
      })
      toast.success(
        `Backorder PO ${result.purchase_order.po_number} created successfully`
      )
      // Navigate to the new PO
      navigate(`/admin/purchase-orders/${result.purchase_order.id}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create backorder PO: ${error.message}`)
    },
  })

  const handleCreateBackorderPO = async () => {
    const confirmed = await confirmDialog({
      title: "Create Backorder Purchase Order",
      description: `Create a new draft purchase order for the ${data?.total_backorder_count} outstanding items from PO ${purchaseOrderNumber}? You can review and edit the new PO before sending it.`,
    })

    if (confirmed) {
      createBackorderPOMutation.mutate()
    }
  }

  const columnHelper = createDataTableColumnHelper<BackorderItem>()

  const columns = useMemo(
    () => [
      columnHelper.accessor("product_title", {
        header: "Product",
        cell: ({ getValue, row }) => (
          <div className="flex flex-col">
            <Text size="small" weight="plus">
              {getValue()}
            </Text>
            {row.original.product_variant_title && (
              <Text size="small" className="text-ui-fg-subtle">
                {row.original.product_variant_title}
              </Text>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("product_sku", {
        header: "SKU",
        cell: ({ getValue }) => (
          <Text size="small" className="text-ui-fg-subtle">
            {getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("quantity_ordered", {
        header: "Ordered",
        cell: ({ getValue }) => <Text size="small">{getValue()}</Text>,
      }),
      columnHelper.accessor("quantity_received", {
        header: "Received",
        cell: ({ getValue }) => <Text size="small">{getValue()}</Text>,
      }),
      columnHelper.accessor("backorder_quantity", {
        header: "Outstanding",
        cell: ({ getValue }) => (
          <Badge color="orange" size="small">
            {getValue()}
          </Badge>
        ),
      }),
    ],
    [columnHelper]
  )

  const table = useDataTable({
    data: data?.backorder_items || [],
    columns,
    rowCount: data?.backorder_items?.length || 0,
    getRowId: (row) => row.purchase_order_item_id,
  })

  if (isLoading) {
    return null
  }

  if (!data || data.total_backorder_count === 0) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <ExclamationCircle className="text-orange-500" />
          <div>
            <Heading level="h2">Outstanding Backorders</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {data.total_backorder_count} items pending delivery
            </Text>
          </div>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={handleCreateBackorderPO}
          isLoading={createBackorderPOMutation.isPending}
        >
          <Plus />
          Create Backorder PO
        </Button>
      </div>
      <div className="bg-orange-50 px-6 py-3">
        <Text size="small" className="text-orange-800">
          These items were ordered but not yet fully received. You can create a
          new purchase order to track these outstanding items.
        </Text>
      </div>
      <DataTable instance={table}>
        <DataTable.Table />
      </DataTable>
    </Container>
  )
}
