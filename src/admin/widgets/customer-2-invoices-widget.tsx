import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Container,
  Heading,
  Text,
  StatusBadge,
  Button,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
} from "@medusajs/ui"
import { Eye, ArrowDownTray } from "@medusajs/icons"
import { Link } from "react-router-dom"

interface Customer {
  id: string
  email?: string
  first_name?: string
  last_name?: string
}

interface WidgetProps {
  data: Customer
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: string
  status: string
  invoice_date: string
  due_date: string
  total_amount: number
  currency_code: string
  pdf_file_id?: string
}

const PAGE_SIZE = 10

// Create filter helper
const filterHelper = createDataTableFilterHelper<Invoice>()

const filters = [
  filterHelper.accessor("status", {
    type: "select",
    label: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Sent", value: "sent" },
      { label: "Paid", value: "paid" },
      { label: "Overdue", value: "overdue" },
      { label: "Cancelled", value: "cancelled" },
    ],
  }),
  filterHelper.accessor("invoice_type", {
    type: "select",
    label: "Type",
    options: [
      { label: "Product Sale", value: "product_sale" },
      { label: "Service Work", value: "service_work" },
      { label: "Mixed", value: "mixed" },
    ],
  }),
]

const CustomerInvoicesWidget = ({ data: customer }: WidgetProps) => {
  const [filtering, setFiltering] = useState({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * PAGE_SIZE
  }, [pagination.pageIndex])

  // Extract filter values from filtering state
  const statusFilter = useMemo(() => {
    const statusValues = (filtering as any)?.status
    return Array.isArray(statusValues) && statusValues.length > 0 ? statusValues[0] : null
  }, [filtering])

  const typeFilter = useMemo(() => {
    const typeValues = (filtering as any)?.invoice_type
    return Array.isArray(typeValues) && typeValues.length > 0 ? typeValues[0] : null
  }, [filtering])

  // Fetch invoices with pagination and filters
  const { data, isLoading } = useQuery({
    queryKey: ['customer-invoices', customer.id, offset, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        customer_id: customer.id,
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
      })

      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('invoice_type', typeFilter)

      const response = await fetch(`/admin/invoices?${params}`)
      if (!response.ok) throw new Error('Failed to fetch invoices')
      return response.json()
    },
  })

  const invoices = data?.invoices || []
  const count = data?.count || 0

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/admin/invoices/${invoiceId}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const columnHelper = createDataTableColumnHelper<Invoice>()

  const columns = [
    columnHelper.accessor("invoice_number", {
      header: "Invoice",
      cell: ({ getValue }) => (
        <Text weight="plus" size="small">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("invoice_type", {
      header: "Type",
      cell: ({ getValue }) => {
        const typeLabels: Record<string, string> = {
          product_sale: "Product Sale",
          service_work: "Service Work",
          mixed: "Mixed",
        }
        return <Text size="small">{typeLabels[getValue()] || getValue()}</Text>
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue()
        const statusConfig: Record<string, { color: "grey" | "red" | "green" | "blue" | "orange" | "purple"; label: string }> = {
          draft: { color: "grey", label: "Draft" },
          sent: { color: "blue", label: "Sent" },
          paid: { color: "green", label: "Paid" },
          overdue: { color: "red", label: "Overdue" },
          cancelled: { color: "purple", label: "Cancelled" },
        }
        const config = statusConfig[status] || { color: "grey" as const, label: status }
        return <StatusBadge color={config.color}>{config.label}</StatusBadge>
      },
    }),
    columnHelper.accessor("invoice_date", {
      header: "Date",
      cell: ({ getValue }) => {
        const dateString = getValue()
        return (
          <Text size="small">
            {dateString ? new Date(dateString).toLocaleDateString() : "—"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
      cell: ({ getValue }) => {
        const dateString = getValue()
        return (
          <Text size="small">
            {dateString ? new Date(dateString).toLocaleDateString() : "—"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("total_amount", {
      header: "Amount",
      cell: ({ getValue, row }) => {
        const amount = getValue()
        const currencyCode = row.original.currency_code
        const value = amount / 100
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currencyCode.toUpperCase(),
        }).format(value)
        return <Text size="small" weight="plus">{formatted}</Text>
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="small" variant="transparent" asChild>
            <Link to={`/invoices/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="small"
            variant="transparent"
            onClick={(e) => {
              e.stopPropagation()
              handleDownloadPDF(row.original.id, row.original.invoice_number)
            }}
          >
            <ArrowDownTray className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    data: invoices,
    columns,
    rowCount: count,
    getRowId: (row) => row.id,
    isLoading,
    filters,
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Invoices</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {count} invoice{count !== 1 ? 's' : ''} for this customer
          </Text>
        </div>
      </div>

      <div className="flex flex-col">
        <DataTable instance={table}>
          <DataTable.Toolbar>
            <DataTable.FilterMenu tooltip="Filter invoices" />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.after",
})

export default CustomerInvoicesWidget
