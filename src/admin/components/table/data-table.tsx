import { Table } from "@tanstack/react-table"
import { 
  DataTable as MedusaDataTable, 
  Input,
  Button,
} from "@medusajs/ui"
import { MagnifyingGlass } from "@medusajs/icons"
import { useState } from "react"

interface _DataTableProps {
  table: Table<any>
  columns: any[]
  filters?: any[]
  pageSize: number
  prefix: string
  count: number
  isLoading: boolean
  layout?: "fill" | "fixed"
  orderBy?: { key: string; label: string }[]
  pagination?: boolean
  search?: boolean
  queryObject?: any
  noRecords?: {
    message: string
  }
}

export const _DataTable = ({
  table,
  columns,
  filters,
  pageSize,
  prefix,
  count,
  isLoading,
  layout = "fixed",
  orderBy,
  pagination = false,
  search = false,
  queryObject,
  noRecords,
}: _DataTableProps) => {
  const [searchValue, setSearchValue] = useState(queryObject?.q || "")

  return (
    <div className="flex flex-col h-full">
      {search && (
        <div className="p-4 border-b">
          <div className="relative">
            <Input
              placeholder="Search products..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
            />
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-auto">
        <MedusaDataTable
          columns={columns}
          data={table.getRowModel().rows.map(row => row.original)}
          pageSize={pageSize}
          count={count}
          isLoading={isLoading}
        />
      </div>
      
      {pagination && (
        <div className="p-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Showing {table.getState().pagination?.pageIndex * pageSize + 1} to{" "}
            {Math.min((table.getState().pagination?.pageIndex + 1) * pageSize, count)} of {count} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {!isLoading && table.getRowModel().rows.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">{noRecords?.message || "No results found"}</p>
        </div>
      )}
    </div>
  )
}