import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
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
  StatusBadge,
  Badge,
  Tooltip
} from "@medusajs/ui"
import {
  Plus,
  Eye,
  PencilSquare,
  ArrowDownTray,
  DocumentText,
  EllipsisHorizontal,
  Trash,
  ReceiptPercent,
  SquaresPlusSolid
} from "@medusajs/icons"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useCustomTranslation } from "../../hooks/use-custom-translation"
import { InvoiceViewModal } from "../../components/invoice-view-modal"
import { InvoiceStatusBadge } from "../../components/common/invoice-status-badge"
import { InvoiceMergeModal } from "../../components/invoice-merge-modal"

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
  metadata?: {
    merged_from?: string[]
    merged_from_numbers?: string[]
    cancelled_reason?: string
    merged_into_invoice_id?: string
    merged_into_invoice_number?: string
  }
  line_items?: any[]
}

// Format currency for Belgian locale
const formatCurrency = (amount: number, currencyCode = "EUR") => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount) // Remove division by 100 - prices are already in correct format
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
    onError: () => {
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
      })
    },
  })
}

const useMergeInvoices = () => {
  const queryClient = useQueryClient()
  const { t } = useCustomTranslation()

  return useMutation({
    mutationFn: async (data: {
      invoice_ids: string[]
      notes?: string
      payment_terms?: string
    }) => {
      const response = await fetch('/admin/invoices/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to merge invoices')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      const count = data.summary?.source_invoice_count || 0
      const invoiceNumber = data.merged_invoice?.invoice_number || ''
      toast.success(
        t("custom.invoices.merge.success", { count, invoiceNumber }),
        {
          description: `${count} invoices merged successfully`
        }
      )
    },
    onError: (error: Error) => {
      toast.error(
        t("custom.invoices.merge.error"),
        {
          description: error.message
        }
      )
    }
  })
}

// Invoice actions component - following MedusaJS best practices
const InvoiceActions = ({
  invoice,
  onViewClick
}: {
  invoice: Invoice
  onViewClick: (invoice: Invoice) => void
}) => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const downloadInvoice = useDownloadInvoice()
  const deleteInvoice = useDeleteInvoice()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(t("custom.invoices.deleteConfirm"))) {
      deleteInvoice.mutate(invoice.id)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="h-4 w-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom" align="end">
        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            onViewClick(invoice)
          }}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {t("custom.invoices.view")}
        </DropdownMenu.Item>

        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            downloadInvoice.mutate(invoice.id)
          }}
          disabled={downloadInvoice.isPending}
          className="flex items-center gap-2"
        >
          <ArrowDownTray className="h-4 w-4" />
          {t("custom.invoices.download")}
        </DropdownMenu.Item>

        {invoice.status === "draft" && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/invoices/${invoice.id}`)
              }}
              className="flex items-center gap-2"
            >
              <PencilSquare className="h-4 w-4" />
              {t("custom.general.edit")}
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
              className="flex items-center gap-2 text-ui-fg-error"
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
  const mergeInvoices = useMergeInvoices()
  
  // Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  
  // Selection state for bulk operations
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedInvoice(null)
  }

  // Data processing (move before conditional returns)
  const invoices = data?.invoices || []
  const count = data?.count || 0

  // Get selected invoices from row selection
  const selectedInvoiceIds = Object.keys(rowSelection).filter(id => rowSelection[id])
  const selectedInvoices = invoices.filter((inv: Invoice) => selectedInvoiceIds.includes(inv.id))

  // Validate if selected invoices can be merged
  const validateMergeSelection = () => {
    if (selectedInvoices.length < 2) {
      return { valid: false, reason: t("custom.invoices.merge.validation.minimum") }
    }

    if (selectedInvoices.length > 10) {
      return { valid: false, reason: t("custom.invoices.merge.validation.maximum") }
    }

    // Check same customer
    const customerIds = [...new Set(selectedInvoices.map((inv: Invoice) => inv.customer?.id))]
    if (customerIds.length > 1) {
      return { valid: false, reason: t("custom.invoices.merge.validation.differentCustomers") }
    }

    // Check all draft
    const nonDraftInvoices = selectedInvoices.filter((inv: Invoice) => inv.status !== "draft")
    if (nonDraftInvoices.length > 0) {
      return { valid: false, reason: t("custom.invoices.merge.validation.notDraft") }
    }

    // Check same currency
    const currencies = [...new Set(selectedInvoices.map((inv: Invoice) => inv.currency_code))]
    if (currencies.length > 1) {
      return { valid: false, reason: t("custom.invoices.merge.validation.differentCurrencies") }
    }

    return { valid: true }
  }

  const handleMergeClick = () => {
    const validation = validateMergeSelection()
    if (!validation.valid) {
      toast.error("Cannot merge invoices", { description: validation.reason })
      return
    }
    setIsMergeModalOpen(true)
  }

  const handleMergeConfirm = async (data: { notes?: string; payment_terms?: string }) => {
    try {
      await mergeInvoices.mutateAsync({
        invoice_ids: selectedInvoiceIds,
        notes: data.notes,
        payment_terms: data.payment_terms,
      })
      setIsMergeModalOpen(false)
      setRowSelection({})
    } catch (error) {
      // Error handled by mutation
    }
  }

  // Column helper and definitions (move before conditional returns)
  const columnHelper = createDataTableColumnHelper<Invoice>()

  const columns = [
    columnHelper.display({
      id: "select",
      header: () => {
        const allDraftIds = invoices
          .filter((inv: Invoice) => inv.status === "draft")
          .map((inv: Invoice) => inv.id)
        const allSelected = allDraftIds.length > 0 && allDraftIds.every((id: string) => rowSelection[id])
        
        return (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              const newSelection: Record<string, boolean> = {}
              if (e.target.checked) {
                allDraftIds.forEach((id: string) => {
                  newSelection[id] = true
                })
              }
              setRowSelection(newSelection)
            }}
            className="cursor-pointer"
          />
        )
      },
      cell: ({ row }) => {
        const invoice = row.original
        if (invoice.status !== "draft") return null
        
        return (
          <input
            type="checkbox"
            checked={rowSelection[invoice.id] || false}
            onChange={(e) => {
              e.stopPropagation()
              setRowSelection(prev => ({
                ...prev,
                [invoice.id]: e.target.checked
              }))
            }}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          />
        )
      },
    }),
    columnHelper.accessor("invoice_number", {
      header: t("custom.invoices.number"),
      enableSorting: true,
      cell: ({ getValue, row }) => {
        const invoice = row.original
        const isMerged = invoice.metadata?.merged_from && invoice.metadata.merged_from.length > 0
        const wasMerged = invoice.metadata?.cancelled_reason === "merged"
        
        return (
          <div className="flex items-center gap-2">
            <Text className="font-medium">{getValue()}</Text>
            {isMerged && invoice.metadata?.merged_from && (
              <Tooltip content={t("custom.invoices.merge.badges.mergedFrom", { 
                count: invoice.metadata.merged_from.length 
              })}>
                <Badge size="2xsmall" color="blue">
                  ↑{invoice.metadata.merged_from.length}
                </Badge>
              </Tooltip>
            )}
            {wasMerged && invoice.metadata?.merged_into_invoice_number && (
              <Tooltip content={t("custom.invoices.merge.badges.mergedInto", { 
                invoiceNumber: invoice.metadata.merged_into_invoice_number 
              })}>
                <Badge size="2xsmall" color="orange">
                  →
                </Badge>
              </Tooltip>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("customer", {
      header: "Customer",
      cell: ({ getValue }) => {
        const customer = getValue()
        if (!customer) return <Text className="text-ui-fg-muted">No customer</Text>

        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`
        return <Text>{name}</Text>
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
      header: t("custom.general.actions"),
      cell: ({ row }) => (
        <InvoiceActions 
          invoice={row.original} 
          onViewClick={handleViewInvoice}
        />
      ),
    }),
  ]

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: invoices,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (_, row) => {
      // Navigate to invoice detail page (following MedusaJS best practices)
      navigate(`/invoices/${row.id}`)
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
            {selectedInvoiceIds.length > 0 && (
              <>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("custom.invoices.merge.selected", { count: selectedInvoiceIds.length })}
                </Text>
                <Button 
                  size="small" 
                  variant="secondary"
                  onClick={handleMergeClick}
                  disabled={selectedInvoiceIds.length < 2}
                >
                  <SquaresPlusSolid className="w-4 h-4 mr-2" />
                  {t("custom.invoices.merge.button")}
                </Button>
              </>
            )}
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

      {/* Merge Modal */}
      <InvoiceMergeModal
        invoices={selectedInvoices}
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        onConfirm={handleMergeConfirm}
        isLoading={mergeInvoices.isPending}
      />
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