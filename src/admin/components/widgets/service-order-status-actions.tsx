import { 
  Container, 
  Heading, 
  Text, 
  Badge, 
  Button, 
  Select,
  Textarea,
  FocusModal,
  StatusBadge,
  Label,
  toast
} from "@medusajs/ui"
import { PencilSquare, Clock, ExclamationCircle } from "@medusajs/icons"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ActionMenu } from "../components/common/action-menu"

interface ServiceOrder {
  id: string
  service_order_number: string
  status: string
  priority: string
}

interface ServiceOrderStatusActionsWidgetProps {
  data: ServiceOrder
}

const ServiceOrderStatusActionsWidget = ({ data: serviceOrder }: ServiceOrderStatusActionsWidgetProps) => {
  const queryClient = useQueryClient()
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to update status")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Service order status updated successfully!")
      // Invalidate all service order related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-orders"] })
      queryClient.invalidateQueries({ queryKey: ["service-orders-customers"] })
      queryClient.invalidateQueries({ queryKey: ["service-orders-technicians"] })
      setShowUpdateModal(false)
      setNewStatus('')
      setReason('')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus || newStatus === serviceOrder.status) return
    updateStatusMutation.mutate({ status: newStatus, reason })
  }

  if (!serviceOrder) {
    return null
  }

  const statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'returned_for_review', label: 'Returned for Review' }
  ]

  const statusVariants = {
    draft: "orange",
    ready_for_pickup: "blue",
    in_progress: "purple", 
    done: "green",
    returned_for_review: "red",
  } as const

  const priorityVariants = {
    low: "grey",
    normal: "blue",
    high: "orange",
    urgent: "red", 
  } as const

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Status & Actions</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: "Update Status",
                  onClick: () => setShowUpdateModal(true),
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>

      {/* Current Status */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-[28px_1fr] items-start gap-x-3 mb-4">
          <div className="bg-ui-bg-base shadow-borders-base flex size-7 items-center justify-center rounded-md">
            <div className="bg-ui-bg-component flex size-6 items-center justify-center rounded-[4px]">
              <ExclamationCircle className="text-ui-fg-subtle" />
            </div>
          </div>
          <div className="min-w-0 flex flex-col">
            <Label size="small" weight="plus" className="mb-2">
              Current Status
            </Label>
            <StatusBadge color={statusVariants[serviceOrder.status as keyof typeof statusVariants]}>
              {serviceOrder.status.replace('_', ' ')}
            </StatusBadge>
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-[28px_1fr] items-start gap-x-3">
          <div className="bg-ui-bg-base shadow-borders-base flex size-7 items-center justify-center rounded-md">
            <div className="bg-ui-bg-component flex size-6 items-center justify-center rounded-[4px]">
              <Clock className="text-ui-fg-subtle" />
            </div>
          </div>
          <div className="min-w-0 flex flex-col">
            <Label size="small" weight="plus" className="mb-2">
              Priority Level
            </Label>
            <StatusBadge color={priorityVariants[serviceOrder.priority as keyof typeof priorityVariants]}>
              {serviceOrder.priority} priority
            </StatusBadge>
          </div>
        </div>
      </div>

      <FocusModal open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-end">
              <FocusModal.Close asChild>
                <Button size="small" variant="secondary">Cancel</Button>
              </FocusModal.Close>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="flex flex-col items-center p-16">
              <div className="w-full max-w-lg">
                <div className="mb-8 text-center">
                  <Heading level="h2" className="mb-2">Update Status</Heading>
                  <Text className="text-ui-fg-subtle">
                    Change the status of this service order
                  </Text>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label size="small" weight="plus" className="mb-2">
                      Current Status: {serviceOrder.status.replace('_', ' ')}
                    </Label>
                    <Select 
                      value={newStatus} 
                      onValueChange={setNewStatus}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select new status" />
                      </Select.Trigger>
                      <Select.Content>
                        {statuses.filter(s => s.value !== serviceOrder.status).map(status => (
                          <Select.Item key={status.value} value={status.value}>
                            {status.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>

                  <div>
                    <Textarea
                      placeholder="Reason for status change (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      disabled={updateStatusMutation.isPending}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      size="small"
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowUpdateModal(false)
                        setNewStatus('')
                        setReason('')
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="small"
                      type="submit" 
                      disabled={!newStatus || updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default ServiceOrderStatusActionsWidget