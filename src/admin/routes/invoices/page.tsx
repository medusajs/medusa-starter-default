import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Button, 
  Badge, 
  Container, 
  Heading, 
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DropdownMenu,
  IconButton,
  toast,
  StatusBadge
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { 
  Plus, 
  Eye, 
  PencilSquare, 
  ArrowDownTray, 
  DocumentText,
  EllipsisHorizontal,
  Trash,
  ArrowUpTray,
  Clock,
  CheckCircleSolid,
  ExclamationCircleSolid,
  XCircle,
  ReceiptPercent
} from "@medusajs/icons"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
<<<<<<< HEAD
import { useCustomTranslation } from "../../hooks/use-custom-translation"
=======
import { InvoiceViewModal } from "../../components/invoice-view-modal"
>>>>>>> 22e8989 (Improve Invoicing module)

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
  }).format(amount) // Remove division by 100 - prices are already in correct format
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
  const { t } = useCustomTranslation()
  
  const statusConfig = {
    draft: { color: "grey" as const, icon: PencilSquare, label: t("custom.invoices.status.draft") },
    sent: { color: "blue" as const, icon: Clock, label: t("custom.invoices.status.sent") },
    paid: { color: "green" as const, icon: CheckCircleSolid, label: t("custom.invoices.status.paid") },
    overdue: { color: "red" as const, icon: ExclamationCircleSolid, label: t("custom.invoices.status.overdue") },
    cancelled: { color: "grey" as const, icon: XCircle, label: t("custom.invoices.status.cancelled") }
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
  const { t } = useCustomTranslation()
  
  const typeConfig = {
    product_sale: { color: "blue" as const, label: t("custom.invoices.types.product_sale") },
    service_work: { color: "green" as const, label: t("custom.invoices.types.service_work") },
    mixed: { color: "purple" as const, label: t("custom.invoices.types.mixed") }
  }

  const config = typeConfig[type]

  return (
    <StatusBadge color={config.color}>
      {config.label}
    </StatusBadge>
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
  const { t } = useCustomTranslation()
  const filterHelper = createDataTableFilterHelper<Invoice>()
  
  return [
    filterHelper.accessor("status", {
      label: t("custom.general.status"),
      type: "select",
      options: [
        { label: t("custom.invoices.status.draft"), value: "draft" },
        { label: t("custom.invoices.status.sent"), value: "sent" },
        { label: t("custom.invoices.status.paid"), value: "paid" },
        { label: t("custom.invoices.status.overdue"), value: "overdue" },
        { label: t("custom.invoices.status.cancelled"), value: "cancelled" },
      ],
    }),
    filterHelper.accessor("invoice_type", {
      label: t("custom.invoices.type"),
      type: "select",
      options: [
        { label: t("custom.invoices.types.product_sale"), value: "product_sale" },
        { label: t("custom.invoices.types.service_work"), value: "service_work" },
        { label: t("custom.invoices.types.mixed"), value: "mixed" },
      ],
    }),
  ]
}

const useDeleteInvoice = () => {
  const { t } = useCustomTranslation()
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
      toast.success("Invoice deleted", {
        description: "The invoice has been successfully deleted.",
      })
    },
    onError: (error) => {
      toast.error("Error", {
        description: "An error occurred while deleting the invoice.",
      })
    },
  })
}

const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      // Trigger download by opening URL with download parameter
      const response = await fetch(`/admin/invoices/${id}/pdf?download=true`)
      if (!response.ok) throw new Error("Failed to download invoice")
      
      // Create blob from response and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `factuur-${Date.now()}.html` // Fallback filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
<<<<<<< HEAD
      toast.success("PDF generated", {
        description: "The invoice PDF has been successfully generated and downloaded.",
      })
    },
    onError: () => {
      toast.error("Error", {
        description: "An error occurred while generating the PDF.",
=======
      return { success: true }
    },
    onSuccess: () => {
      toast.success("Download gestart", {
        description: "De factuur wordt gedownload.",
      })
    },
    onError: () => {
      toast.error("Fout", {
        description: "Er is een fout opgetreden bij het downloaden van de factuur.",
>>>>>>> 22e8989 (Improve Invoicing module)
      })
    },
  })
}

// Page constants
const PAGE_SIZE = 20

// Invoice actions component
<<<<<<< HEAD
const InvoiceActions = ({ invoice }: { invoice: Invoice }) => {
  const { t } = useCustomTranslation()
=======
const InvoiceActions = ({ 
  invoice, 
  onViewClick 
}: { 
  invoice: Invoice
  onViewClick: (invoice: Invoice) => void 
}) => {
>>>>>>> 22e8989 (Improve Invoicing module)
  const navigate = useNavigate()
  const downloadInvoice = useDownloadInvoice()

  return (
<<<<<<< HEAD
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="h-4 w-4" />
=======
    <div className="flex items-center gap-2">
      <IconButton
        size="small"
        variant="transparent"
        onClick={() => onViewClick(invoice)}
        title="Bekijk factuur"
      >
        <Eye className="w-4 h-4" />
      </IconButton>
      
      <IconButton
        size="small"
        variant="transparent"
        onClick={() => downloadInvoice.mutate(invoice.id)}
        disabled={downloadInvoice.isPending}
        title="Download factuur"
      >
        <ArrowDownTray className="w-4 h-4" />
      </IconButton>
      
      {invoice.status === "draft" && (
        <IconButton
          size="small"
          variant="transparent"
          onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
          title="Bewerk factuur"
        >
          <PencilSquare className="w-4 h-4" />
>>>>>>> 22e8989 (Improve Invoicing module)
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom">
        {invoice.status === "draft" && (
          <>
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/invoices/${invoice.id}/edit`)
              }}
              className="[&>svg]:text-ui-fg-subtle flex items-center gap-2"
            >
              <PencilSquare className="h-4 w-4" />
              {t("custom.general.edit")}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Add delete invoice functionality
                console.log('Delete invoice:', invoice.id)
              }}
              className="[&>svg]:text-ui-fg-subtle flex items-center gap-2 text-ui-fg-error"
            >
              <Trash className="h-4 w-4" />
              {t("custom.general.delete")}
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

// DataTable setup
const InvoicesListTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useInvoices()
  const filters = useInvoiceFilters()
  
  // Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  
  // Filter state management
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

<<<<<<< HEAD
  // Data processing (move before conditional returns)
=======
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedInvoice(null)
  }

  if (error) {
    throw error
  }

>>>>>>> 22e8989 (Improve Invoicing module)
  const invoices = data?.invoices || []
  const count = data?.count || 0

  // Column helper and definitions (move before conditional returns)
  const columnHelper = createDataTableColumnHelper<Invoice>()

  const columns = [
    columnHelper.accessor("invoice_number", {
      header: t("custom.invoices.number"),
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <button
          onClick={() => handleViewInvoice(row.original)}
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer text-left"
        >
          {getValue()}
        </button>
      ),
    }),
    columnHelper.accessor("customer", {
      header: "Customer",
      cell: ({ getValue }) => {
        const customer = getValue()
        if (!customer) return <Text className="text-ui-fg-muted">No customer</Text>
        
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
      header: t("custom.invoices.type"),
      cell: ({ getValue }) => <InvoiceTypeBadge type={getValue()} />,
    }),
    columnHelper.accessor("status", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => <InvoiceStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("total_amount", {
      header: "Total",
      cell: ({ getValue }) => {
        const total = getValue() || 0
        return (
          <Text size="small" className="font-mono">
            {formatCurrency(total)}
          </Text>
        )
      },
    }),
    columnHelper.accessor("created_at", {
      header: t("custom.general.created"),
      cell: ({ getValue }) => (
        <Text size="small">
          {new Date(getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
<<<<<<< HEAD
      header: t("custom.general.actions"),
      cell: ({ row }) => <InvoiceActions invoice={row.original} />,
=======
      header: "Acties",
      cell: ({ row }) => (
        <InvoiceActions 
          invoice={row.original} 
          onViewClick={handleViewInvoice}
        />
      ),
>>>>>>> 22e8989 (Improve Invoicing module)
    }),
  ]

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: invoices,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (event, row) => {
      navigate(`/invoices/${row.id}`)
    },
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
          <Heading>{t("custom.invoices.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your invoices and payments ({count} invoices)
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
              {t("custom.invoices.create")}
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
            <DataTable.Search placeholder="Search invoices..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      {/* View Modal */}
      {selectedInvoice && (
        <InvoiceViewModal
          invoice={selectedInvoice}
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}
    </Container>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Invoices",
  icon: DocumentText,
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: () => "Invoices",
}

// Main invoices page component
const InvoicesPage = () => {
  return <InvoicesListTable />
}

export default InvoicesPage 