import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { Badge, Text } from "@medusajs/ui"

interface Product {
  id: string
  title: string
  status: string
  thumbnail?: string
  created_at: string
  updated_at: string
  variants?: any[]
}

const columnHelper = createColumnHelper<Product>()

export const useProductTableColumns = () => {
  return useMemo(() => [
    columnHelper.accessor("title", {
      header: "Title",
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail && (
            <img 
              src={row.original.thumbnail} 
              alt={getValue()}
              className="w-8 h-8 rounded object-cover"
            />
          )}
          <div>
            <Text className="font-medium">{getValue()}</Text>
            <Text size="small" className="text-gray-500">
              {row.original.variants?.length || 0} variant(s)
            </Text>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "published" ? "green" : "orange"}>
          {getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: "Created",
      cell: ({ getValue }) => (
        <Text size="small">
          {new Date(getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
  ], [])
}