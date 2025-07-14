import { DropdownMenu, IconButton, toast } from "@medusajs/ui"
import { EllipsisHorizontal } from "@medusajs/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Supplier } from "../routes/suppliers/page"
import { EditSupplierForm } from "./edit-supplier-form"

type SupplierActionsProps = {
  supplier: Supplier
}

// Delete supplier mutation
const useDeleteSupplier = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/suppliers/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete supplier")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Supplier deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: () => {
      toast.error("Failed to delete supplier")
    },
  })
}

export const SupplierActions = ({ supplier }: SupplierActionsProps) => {
  const deleteSupplierMutation = useDeleteSupplier()

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      deleteSupplierMutation.mutate(supplier.id)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton>
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <EditSupplierForm 
          supplier={supplier}
          trigger={<DropdownMenu.Item>Edit</DropdownMenu.Item>}
        />
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={handleDelete} disabled={deleteSupplierMutation.isPending}>
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
} 