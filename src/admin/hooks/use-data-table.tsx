import { useMemo } from "react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnDef,
  PaginationState,
  RowSelectionState,
  OnChangeFn,
} from "@tanstack/react-table"

interface UseDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  count: number
  enablePagination?: boolean
  enableRowSelection?: boolean | ((row: any) => boolean)
  getRowId?: (row: T) => string
  rowSelection?: {
    state: RowSelectionState
    updater: OnChangeFn<RowSelectionState>
  }
  pageSize: number
  pagination?: {
    state: PaginationState
    onPaginationChange: OnChangeFn<PaginationState>
  }
}

export const useDataTable = <T,>({
  data,
  columns,
  count,
  enablePagination = false,
  enableRowSelection = false,
  getRowId,
  rowSelection,
  pageSize,
  pagination,
}: UseDataTableProps<T>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(enablePagination && {
      getPaginationRowModel: getPaginationRowModel(),
      manualPagination: true,
      pageCount: Math.ceil(count / pageSize),
    }),
    ...(enableRowSelection && {
      enableRowSelection: typeof enableRowSelection === "function" ? enableRowSelection : true,
    }),
    ...(getRowId && { getRowId }),
    ...(rowSelection && {
      state: {
        rowSelection: rowSelection.state,
      },
      onRowSelectionChange: rowSelection.updater,
    }),
    ...(pagination && {
      state: {
        pagination: pagination.state,
      },
      onPaginationChange: pagination.onPaginationChange,
    }),
  })

  return { table }
}