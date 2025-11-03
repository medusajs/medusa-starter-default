import {
  Container,
  Heading,
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  Badge,
} from "@medusajs/ui"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

interface DeliveryHistoryProps {
  purchaseOrderId: string
}

interface Delivery {
  id: string
  delivery_number?: string
  delivery_date: Date
  received_by?: string
  notes?: string
  import_filename?: string
  items?: DeliveryItem[]
}

interface DeliveryItem {
  id: string
  quantity_delivered: number
  notes?: string
}

const useDeliveries = (purchaseOrderId: string) => {
  return useQuery({
    queryKey: ["purchase-order-deliveries", purchaseOrderId],
    queryFn: async () => {
      const response = await fetch(
        `/admin/purchase-orders/${purchaseOrderId}/deliveries`
      )
      if (!response.ok) throw new Error("Failed to fetch deliveries")
      const data = await response.json()
      return data.deliveries as Delivery[]
    },
  })
}

export const DeliveryHistory = ({ purchaseOrderId }: DeliveryHistoryProps) => {
  const { data: deliveries, isLoading } = useDeliveries(purchaseOrderId)

  const columnHelper = createDataTableColumnHelper<Delivery>()

  const columns = useMemo(
    () => [
      columnHelper.accessor("delivery_number", {
        header: "Delivery #",
        cell: ({ getValue }) => {
          const value = getValue()
          return (
            <Text size="small" weight="plus">
              {value || "—"}
            </Text>
          )
        },
      }),
      columnHelper.accessor("delivery_date", {
        header: "Date",
        cell: ({ getValue }) => {
          const date = new Date(getValue())
          return (
            <Text size="small">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          )
        },
      }),
      columnHelper.accessor("items", {
        header: "Items",
        cell: ({ getValue }) => {
          const items = getValue() || []
          const totalQuantity = items.reduce(
            (sum, item) => sum + item.quantity_delivered,
            0
          )
          return (
            <div className="flex items-center gap-2">
              <Badge size="small">{items.length} items</Badge>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {totalQuantity} units
              </Text>
            </div>
          )
        },
      }),
      columnHelper.accessor("received_by", {
        header: "Received By",
        cell: ({ getValue }) => {
          const value = getValue()
          return (
            <Text size="small" className="text-ui-fg-subtle">
              {value || "—"}
            </Text>
          )
        },
      }),
      columnHelper.accessor("notes", {
        header: "Notes",
        cell: ({ getValue }) => {
          const value = getValue()
          if (!value) {
            return (
              <Text size="small" className="text-ui-fg-subtle">
                —
              </Text>
            )
          }
          return (
            <Text size="small" className="truncate max-w-xs">
              {value}
            </Text>
          )
        },
      }),
    ],
    [columnHelper]
  )

  const table = useDataTable({
    data: deliveries || [],
    columns,
    rowCount: deliveries?.length || 0,
    getRowId: (row) => row.id,
  })

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Delivery History</Heading>
        </div>
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Loading deliveries...</Text>
        </div>
      </Container>
    )
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Delivery History</Heading>
        </div>
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">
            No deliveries have been recorded yet
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Delivery History ({deliveries.length})</Heading>
      </div>
      <DataTable instance={table}>
        <DataTable.Table />
      </DataTable>
    </Container>
  )
}
