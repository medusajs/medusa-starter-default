import {
  Button,
  clx,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { RouteFocusModal } from "../../../components/modals/route-focus-modal"
import { useQuery } from "@tanstack/react-query"
import { HttpTypes } from "@medusajs/types"
import { sdk } from "../../../lib/sdk"

type SelectCustomerFormProps = {
  onSelect?: (customerId: string) => void
}

const PAGE_SIZE = 10

// Fetch customers hook using Medusa SDK
const useCustomers = (searchQuery: string, offset: number) => {
  return useQuery({
    queryKey: ["customers", searchQuery, offset, PAGE_SIZE],
    queryFn: async () => {
      // Use Medusa SDK to fetch customers with proper query parameters
      const { customers, count } = await sdk.admin.customer.list({
        q: searchQuery || undefined,
        limit: PAGE_SIZE,
        offset,
        fields: "*addresses", // Use * prefix to include the addresses relation
      })

      return {
        customers: customers || [],
        count: count || 0,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

const SelectCustomerForm = ({ onSelect }: SelectCustomerFormProps) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * PAGE_SIZE
  }, [pagination.pageIndex])

  // Use customer hook with search and pagination (using SDK)
  const { data, isLoading, isError, error } = useCustomers(search, offset)

  const customers = data?.customers || []
  const count = data?.count || 0

  const columns = useColumns()

  // Handle row click to select customer
  const handleRowClick = (event: React.MouseEvent, row: HttpTypes.AdminCustomer) => {
    if (onSelect) {
      onSelect(row.id)
    }

    // Navigate back to create page with customer ID
    const returnTo = searchParams.get("return_to") || "/offers/create"
    navigate(`${returnTo}?customer_id=${row.id}`, { replace: true })
  }

  // Create table instance using Medusa's useDataTable hook
  const table = useDataTable({
    data: customers,
    columns,
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    onRowClick: handleRowClick,
  })

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {/* Hidden title for accessibility - required by Radix Dialog */}
      <span className={clx("sr-only")}>
        <RouteFocusModal.Title>Select Customer</RouteFocusModal.Title>
        <RouteFocusModal.Description>
          Click on a customer to select them for this offer
        </RouteFocusModal.Description>
      </span>

      <RouteFocusModal.Header>
        <div className="flex items-center justify-end gap-x-2">
          <RouteFocusModal.Close asChild>
            <Button variant="secondary" size="small">
              Cancel
            </Button>
          </RouteFocusModal.Close>
        </div>
      </RouteFocusModal.Header>

      <RouteFocusModal.Body className="size-full overflow-hidden flex flex-col">
        <DataTable instance={table}>
          <DataTable.Toolbar className="p-4 border-b">
            <DataTable.Search placeholder="Search customers..." />
          </DataTable.Toolbar>
          <div className="flex-1 overflow-auto">
            <DataTable.Table />
          </div>
          <DataTable.Pagination className="border-t" />
        </DataTable>
        {!isLoading && customers.length === 0 && (
          <div className="p-8 text-center text-ui-fg-subtle">
            {search
              ? `No customers found matching "${search}"`
              : "No customers found. Create a customer first."}
          </div>
        )}
      </RouteFocusModal.Body>
    </RouteFocusModal>
  )
}

const columnHelper = createDataTableColumnHelper<HttpTypes.AdminCustomer>()

const useColumns = () => {
  const { t } = useTranslation()

  const columns = useMemo(
    () => [
      columnHelper.accessor("email", {
        header: "Email",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("first_name", {
        header: "First Name",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("last_name", {
        header: "Last Name",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: ({ getValue }) => getValue() || "-",
      }),
    ],
    [t]
  )

  return columns
}

/**
 * Customer Selection Modal Page
 *
 * Modal route for selecting a customer when creating an offer.
 * Follows MedusaJS pattern from customer-group-add-customers.
 */
const SelectCustomerPage = () => {
  return (
    <RouteFocusModal>
      <SelectCustomerForm />
    </RouteFocusModal>
  )
}

export default SelectCustomerPage
