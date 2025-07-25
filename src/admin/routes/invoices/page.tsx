import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Plus, 
  Eye, 
  PencilSquare, 
  DocumentText, 
  ArrowDownTray,
  Clock,
  CheckCircleSolid,
  ExclamationCircleSolid,
  XCircle,
  ReceiptPercent
} from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  StatusBadge,
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  toast
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

// Types for invoice data
interface Invoice {
  id: string
  invoice_number: string
  invoice_type: "product_sale" | "service_work" | "mixed"
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  currency_code: string
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  invoice_date: string
  due_date: string
  customer?: {
    id: string
    first_name: string
    last_name: string
    company_name?: string
    email: string
  }
  order_id?: string
  service_order_id?: string
  pdf_file_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Format currency for Belgian locale
const formatCurrency = (amount: number, currencyCode = "EUR") => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount / 100) // Amount is stored in cents
}

// Format date for Belgian locale
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("nl-BE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))
}

// Status badge component
const InvoiceStatusBadge = ({ status }: { status: Invoice["status"] }) => {
  const statusConfig = {
    draft: { color: "grey" as const, icon: PencilSquare, label: "Concept" },
    sent: { color: "blue" as const, icon: Clock, label: "Verzonden" },
    paid: { color: "green" as const, icon: CheckCircleSolid, label: "Betaald" },
    overdue: { color: "red" as const, icon: ExclamationCircleSolid, label: "Vervallen" },
    cancelled: { color: "grey" as const, icon: XCircle, label: "Geannuleerd" }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <StatusBadge color={config.color} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </StatusBadge>
  )
}

// Type badge component
const InvoiceTypeBadge = ({ type }: { type: Invoice["invoice_type"] }) => {
  const typeConfig = {
    product_sale: { color: "blue" as const, label: "Productverkoop" },
    service_work: { color: "green" as const, label: "Servicewerk" },
    mixed: { color: "purple" as const, label: "Gemengd" }
  }

  const config = typeConfig[type]

  return (
    <Badge color={config.color}>
      {config.label}
    </Badge>
  )
}

// API functions
const useInvoices = () => {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await fetch(`/admin/invoices`)
      if (!response.ok) throw new Error("Failed to fetch invoices")
      return response.json()
    },
  })
}

const useInvoiceFilters = () => {
  const filterHelper = createDataTableFilterHelper<Invoice>()
  
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Concept", value: "draft" },
        { label: "Verzonden", value: "sent" },
        { label: "Betaald", value: "paid" },
        { label: "Vervallen", value: "overdue" },
        { label: "Geannuleerd", value: "cancelled" },
      ],
    }),
    filterHelper.accessor("invoice_type", {
      label: "Type",
      type: "select",
      options: [
        { label: "Productverkoop", value: "product_sale" },
        { label: "Servicewerk", value: "service_work" },
        { label: "Gemengd", value: "mixed" },
      ],
    }),
  ]
}

const useDeleteInvoice = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/invoices/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete invoice")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast.success("Factuur verwijderd", {
        description: "De factuur is succesvol verwijderd.",
      })
    },
    onError: (error) => {
      toast.error("Fout", {
        description: "Er is een fout opgetreden bij het verwijderen van de factuur.",
      })
    },
  })
}

const useGeneratePdf = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/invoices/${id}/pdf`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to generate PDF")
      return response.json()
    },
    onSuccess: (data) => {
      // Create download link
      const link = document.createElement("a")
      link.href = data.pdf_url
      link.download = data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("PDF gegenereerd", {
        description: "De factuur PDF is succesvol gegenereerd en gedownload.",
      })
    },
    onError: () => {
      toast.error("Fout", {
        description: "Er is een fout opgetreden bij het genereren van de PDF.",
      })
    },
  })
}

// Page constants
const PAGE_SIZE = 20

// Invoice actions component
const InvoiceActions = ({ invoice }: { invoice: Invoice }) => {
  const navigate = useNavigate()
  const generatePdf = useGeneratePdf()

  return (
    <div className="flex items-center gap-2">
      <Button
        size="small"
        variant="transparent"
        onClick={() => navigate(`/invoices/${invoice.id}`)}
      >
        <Eye className="w-4 h-4" />
      </Button>
      
      <Button
        size="small"
        variant="transparent"
        onClick={() => generatePdf.mutate(invoice.id)}
        disabled={generatePdf.isPending}
      >
        <ArrowDownTray className="w-4 h-4" />
      </Button>
      
      {invoice.status === "draft" && (
        <Button
          size="small"
          variant="transparent"
          onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
        >
          <PencilSquare className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

// DataTable setup
const InvoicesListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useInvoices()
  const filters = useInvoiceFilters()
  
  // Filter state management
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  // Data processing (move before conditional returns)
  const invoices = data?.invoices || []
  const count = data?.count || 0

  // Column helper and definitions (move before conditional returns)
  const columnHelper = createDataTableColumnHelper<Invoice>()

  const columns = [
    columnHelper.accessor("invoice_number", {
      header: "Factuurnummer",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <Link 
          to={`/invoices/${row.original.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("customer", {
      header: "Klant",
      cell: ({ getValue }) => {
        const customer = getValue()
        if (!customer) return <Text className="text-ui-fg-muted">Geen klant</Text>
        
        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`
        return (
          <div>
            <Text size="small" weight="plus">{name}</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">{customer.email}</Text>
          </div>
        )
      },
    }),
    columnHelper.accessor("invoice_type", {
      header: "Type",
      cell: ({ getValue }) => <InvoiceTypeBadge type={getValue()} />,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => <InvoiceStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("total_amount", {
      header: "Totaal",
      cell: ({ getValue }) => {
        const total = getValue() || 0
        return (
          <Text size="small" className="font-mono">
            €{(total / 100).toFixed(2)}
          </Text>
        )
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Aangemaakt",
      cell: ({ getValue }) => (
        <Text size="small">
          {new Date(getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acties",
      cell: ({ row }) => <InvoiceActions invoice={row.original} />,
    }),
  ]

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: invoices,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  // NOW we can have conditional returns after all hooks are called
  if (error) {
    throw error
  }

  // Show loading state (move after all hooks)
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading invoices...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Facturen</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Beheer uw facturen en betalingen ({count} facturen)
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="/invoices/analytics">
              <ReceiptPercent className="w-4 h-4 mr-2" />
              Analytics
            </Link>
          </Button>
          <Button size="small" variant="secondary" asChild>
            <Link to="/invoices/create">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Factuur
            </Link>
          </Button>
        </div>
      </div>

      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Zoek facturen..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Facturen",
  icon: DocumentText,
})

// Main invoices page component
const InvoicesPage = () => {
  return <InvoicesListTable />
}

export default InvoicesPage 