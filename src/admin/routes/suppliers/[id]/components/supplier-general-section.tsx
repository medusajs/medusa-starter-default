import { PencilSquare, Trash } from "@medusajs/icons"
import {
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
  DropdownMenu,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate, Link } from "react-router-dom"
import { ActionMenu } from "../../../../components/common/action-menu"
import { EditSupplierForm } from "../../../../components/edit-supplier-form"

type SupplierGeneralSectionProps = {
  supplier: any
}

export const SupplierGeneralSection = ({
  supplier,
}: SupplierGeneralSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()

  const statusColor = supplier.is_active ? "green" : "red"
  const statusText = supplier.is_active ? "Active" : "Inactive"

  const handleDelete = async () => {
    const res = await prompt({
      title: "Delete Supplier",
      description: `Are you sure you want to delete supplier "${supplier.name}"?`,
      verificationInstruction: "Type to confirm",
      verificationText: supplier.name,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (!res) {
      return
    }

    try {
      const response = await fetch(`/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete supplier")
      }

      toast.success(`Supplier "${supplier.name}" deleted successfully`)
      navigate("/suppliers", { replace: true })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">{supplier.name}</Heading>
          {supplier.code && (
            <Text size="small" className="text-ui-fg-subtle">
              Code: {supplier.code}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-x-2">
          <StatusBadge color={statusColor}>{statusText}</StatusBadge>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: "Edit",
                    icon: <PencilSquare />,
                    render: () => (
                      <EditSupplierForm
                        supplier={supplier}
                        trigger={
                          <DropdownMenu.Item className="flex items-center gap-2">
                            <PencilSquare className="w-4 h-4" />
                            Edit
                          </DropdownMenu.Item>
                        }
                      />
                    ),
                  },
                  {
                    label: "Configuration",
                    icon: <PencilSquare />,
                    to: `/suppliers/${supplier.id}/settings`,
                  },
                  {
                    label: "View Purchase Orders",
                    to: `/purchase-orders?supplier_id=${supplier.id}`,
                  },
                ],
              },
              {
                actions: [
                  {
                    label: "Delete",
                    icon: <Trash />,
                    onClick: handleDelete,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Currency
            </Text>
            <Text>{supplier.currency_code || "USD"}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Status
            </Text>
            <Text>{supplier.is_active ? "Active" : "Inactive"}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Created
            </Text>
            <Text>
              {supplier.created_at
                ? new Date(supplier.created_at).toLocaleDateString()
                : "N/A"}
            </Text>
          </div>
        </div>
        {supplier.notes && (
          <div className="mt-4">
            <Text size="small" className="text-ui-fg-subtle">
              Notes
            </Text>
            <Text className="mt-1">{supplier.notes}</Text>
          </div>
        )}
      </div>
    </Container>
  )
}