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
import { CheckCircleSolid, Clock, ExclamationCircle } from "@medusajs/icons"

interface PurchaseOrderItem {
  id: string
  product_variant_id: string
  product_title: string
  product_variant_title?: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  line_total: number
  received_date?: Date
  notes?: string
}

interface GroupedPurchaseOrderItem extends PurchaseOrderItem {
  underlyingItemIds: string[]
}

interface PurchaseOrder {
  id: string
  items: PurchaseOrderItem[]
  currency_code: string
  status: string
}

interface PurchaseOrderItemsProps {
  data: PurchaseOrder
}

const formatCurrency = (amount: number, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount / 100)
}

/**
 * Groups purchase order items by product_variant_id and sums their quantities
 */
const groupItemsByVariant = (items: PurchaseOrderItem[]): GroupedPurchaseOrderItem[] => {
  const groupedMap = new Map<string, PurchaseOrderItem[]>()
  
  // Group items by variant_id
  items.forEach(item => {
    const variantId = item.product_variant_id
    if (!groupedMap.has(variantId)) {
      groupedMap.set(variantId, [])
    }
    groupedMap.get(variantId)!.push(item)
  })
  
  // Create grouped items with summed quantities
  const groupedItems: GroupedPurchaseOrderItem[] = []
  
  groupedMap.forEach((variantItems, variantId) => {
    if (variantItems.length === 0) return
    
    const firstItem = variantItems[0]
    
    // Sum quantities
    const totalQuantityOrdered = variantItems.reduce((sum, item) => sum + item.quantity_ordered, 0)
    const totalQuantityReceived = variantItems.reduce((sum, item) => sum + item.quantity_received, 0)
    
    // Use the first item's unit_cost (assuming all items of the same variant have the same cost)
    // If costs differ, we'll use the first one - in practice they should be the same
    const unitCost = firstItem.unit_cost
    
    // Recalculate line_total based on grouped quantity
    const lineTotal = totalQuantityOrdered * unitCost
    
    // Collect all underlying item IDs
    const underlyingItemIds = variantItems.map(item => item.id)
    
    groupedItems.push({
      ...firstItem,
      id: `${variantId}-grouped`, // Composite ID for the grouped item
      quantity_ordered: totalQuantityOrdered,
      quantity_received: totalQuantityReceived,
      unit_cost: unitCost,
      line_total: lineTotal,
      underlyingItemIds,
    })
  })
  
  return groupedItems
}

export const PurchaseOrderItems = ({ data: purchaseOrder }: PurchaseOrderItemsProps) => {
  // Group items by variant before displaying
  const groupedItems = useMemo(() => {
    if (!purchaseOrder.items || purchaseOrder.items.length === 0) return []
    return groupItemsByVariant(purchaseOrder.items)
  }, [purchaseOrder.items])

  const columnHelper = createDataTableColumnHelper<GroupedPurchaseOrderItem>()

  const columns = useMemo(() => [
    columnHelper.accessor("product_title", {
      header: "Product",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col">
          <Text size="small" weight="plus">{getValue()}</Text>
          {row.original.product_variant_title && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.original.product_variant_title}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("quantity_ordered", {
      header: "Qty Ordered",
      cell: ({ getValue }) => <Text size="small">{getValue()}</Text>,
    }),
    columnHelper.accessor("quantity_received", {
      header: "Status",
      cell: ({ getValue, row }) => {
        const received = getValue()
        const ordered = row.original.quantity_ordered
        const backorder = ordered - received

        const isFullyReceived = received >= ordered
        const isPartiallyReceived = received > 0 && received < ordered
        const isPending = received === 0

        return (
          <div className="flex items-center gap-2">
            {/* Status Icon */}
            {isFullyReceived && (
              <CheckCircleSolid className="text-green-500" />
            )}
            {isPartiallyReceived && (
              <ExclamationCircle className="text-orange-500" />
            )}
            {isPending && <Clock className="text-gray-400" />}

            {/* Quantity Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <Text size="small" weight="plus">
                  {received}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  / {ordered}
                </Text>
              </div>
              {backorder > 0 && (
                <Badge color="orange" size="small" className="mt-1">
                  {backorder} backorder
                </Badge>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor("unit_cost", {
      header: "Unit Cost",
      cell: ({ getValue }) => (
        <Text size="small">
          {formatCurrency(getValue(), purchaseOrder.currency_code)}
        </Text>
      ),
    }),
    columnHelper.accessor("line_total", {
      header: "Total",
      cell: ({ getValue }) => (
        <Text size="small" weight="plus">
          {formatCurrency(getValue(), purchaseOrder.currency_code)}
        </Text>
      ),
    }),
  ], [purchaseOrder.currency_code])

  const table = useDataTable({
    data: groupedItems,
    columns,
    rowCount: groupedItems.length,
    getRowId: (row) => row.id,
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Items ({groupedItems.length})</Heading>
      </div>
      <DataTable instance={table}>
        <DataTable.Table />
      </DataTable>
    </Container>
  )
}
