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
  EnvelopeSolid,
} from "@medusajs/icons"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useCustomTranslation } from "../../hooks/use-custom-translation"
import { OfferStatusBadge } from "../../components/common/offer-status-badge"

// Types for offer data
interface Offer {
  id: string
  offer_number: string
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"
  currency_code: string
  subtotal: number
  tax_amount: number
  total_amount: number
  offer_date: string
  valid_until: string
  customer_id: string
  customer_email: string
  customer_name?: string | null
  customer_phone?: string
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
  }).format(amount)
}

// API functions
const useOffers = () => {
  return useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const response = await fetch(`/admin/offers`)
      if (!response.ok) throw new Error("Failed to fetch offers")
      return response.json()
    },
  })
}

const useOfferFilters = () => {
  const { t } = useCustomTranslation()
  const filterHelper = createDataTableFilterHelper<Offer>()
  
  return [
    filterHelper.accessor("status", {
      label: t("custom.general.status"),
      type: "select",
      options: [
        { label: t("custom.offers.status.draft"), value: "draft" },
        { label: t("custom.offers.status.sent"), value: "sent" },
        { label: t("custom.offers.status.accepted"), value: "accepted" },
        { label: t("custom.offers.status.rejected"), value: "rejected" },
        { label: t("custom.offers.status.expired"), value: "expired" },
        { label: t("custom.offers.status.converted"), value: "converted" },
      ],
    }),
  ]
}

const useDeleteOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/offers/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete offer")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] })
      toast.success("Offer deleted", {
        description: "The offer has been successfully deleted.",
      })
    },
    onError: () => {
      toast.error("Error", {
        description: "An error occurred while deleting the offer.",
      })
    },
  })
}

const useDownloadOffer = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      // Trigger download by opening URL with download parameter
      const response = await fetch(`/admin/offers/${id}/pdf?download=true`)
      if (!response.ok) throw new Error("Failed to download offer")
      
      // Create blob from response and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `offer-${Date.now()}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return { success: true }
    },
    onSuccess: () => {
      toast.success("Download started", {
        description: "The offer is being downloaded.",
      })
    },
    onError: () => {
      toast.error("Error", {
        description: "An error occurred while downloading the offer.",
      })
    },
  })
}

const useSendOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/offers/${id}/send`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to send offer")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] })
      toast.success("Offer sent", {
        description: "The offer has been sent to the customer.",
      })
    },
    onError: () => {
      toast.error("Error", {
        description: "An error occurred while sending the offer.",
      })
    },
  })
}

// Page constants
const PAGE_SIZE = 20

// Offer actions component - following MedusaJS best practices
const OfferActions = ({
  offer,
}: {
  offer: Offer
}) => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const downloadOffer = useDownloadOffer()
  const deleteOffer = useDeleteOffer()
  const sendOffer = useSendOffer()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(t("custom.offers.deleteConfirm"))) {
      deleteOffer.mutate(offer.id)
    }
  }

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm("Are you sure you want to send this offer to the customer?")) {
      sendOffer.mutate(offer.id)
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
            navigate(`/offers/${offer.id}`)
          }}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {t("custom.offers.view")}
        </DropdownMenu.Item>

        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            downloadOffer.mutate(offer.id)
          }}
          disabled={downloadOffer.isPending}
          className="flex items-center gap-2"
        >
          <ArrowDownTray className="h-4 w-4" />
          {t("custom.offers.download")}
        </DropdownMenu.Item>

        {offer.status === "draft" && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={handleSend}
              disabled={sendOffer.isPending}
              className="flex items-center gap-2"
            >
              <EnvelopeSolid className="h-4 w-4" />
              {t("custom.offers.send")}
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/offers/${offer.id}/edit`)
              }}
              className="flex items-center gap-2"
            >
              <PencilSquare className="h-4 w-4" />
              {t("custom.general.edit")}
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onClick={handleDelete}
              disabled={deleteOffer.isPending}
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
const OffersListTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useOffers()
  const filters = useOfferFilters()
  
  // Filter state management
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  // Data processing (move before conditional returns)
  const offers = data?.offers || []
  const count = data?.count || 0

  // Column helper and definitions (move before conditional returns)
  const columnHelper = createDataTableColumnHelper<Offer>()

  const columns = [
    columnHelper.accessor("offer_number", {
      header: t("custom.offers.number"),
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">
          {getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("customer_name", {
      header: t("custom.offers.customer"),
      cell: ({ row }) => {
        const customerName = row.original.customer_name
        const customerEmail = row.original.customer_email

        if (!customerName && !customerEmail) {
          return <Text className="text-ui-fg-muted">No customer</Text>
        }

        return (
          <div>
            <Text weight="plus">{customerName || "Unknown"}</Text>
            {customerName && customerEmail && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                {customerEmail}
              </Text>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("status", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => <OfferStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("offer_date", {
      header: t("custom.offers.date"),
      cell: ({ getValue }) => (
        <Text size="small">
          {new Date(getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
    columnHelper.accessor("valid_until", {
      header: t("custom.offers.valid_until"),
      cell: ({ getValue }) => (
        <Text size="small">
          {new Date(getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
    columnHelper.accessor("total_amount", {
      header: t("custom.offers.amount"),
      cell: ({ getValue }) => {
        const total = getValue() || 0
        return (
          <Text size="small" className="font-mono">
            {formatCurrency(total)}
          </Text>
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: t("custom.general.actions"),
      cell: ({ row }) => (
        <OfferActions 
          offer={row.original}
        />
      ),
    }),
  ]

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: offers,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (_, row) => {
      // Navigate to offer detail page (following MedusaJS best practices)
      navigate(`/offers/${row.id}`)
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
          <Text className="text-ui-fg-subtle">Loading offers...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("custom.offers.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your offers and quotes ({count} offers)
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="/offers/create">
              <Plus className="w-4 h-4 mr-2" />
              {t("custom.offers.create")}
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
            <DataTable.Search placeholder="Search offers..." />
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
  label: "Offers",
  icon: DocumentText,
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: () => "Offers",
}

// Main offers page component
const OffersPage = () => {
  return <OffersListTable />
}

export default OffersPage

