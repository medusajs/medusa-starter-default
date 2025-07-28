import { Container, Heading, Text, Badge, Table, Label } from "@medusajs/ui"
import { ChevronDownMini } from "@medusajs/icons"

interface StatusHistoryEntry {
  id: string
  from_status?: string
  to_status: string
  changed_by: string
  reason?: string
  changed_at: string
}

interface ServiceOrder {
  id: string
  service_order_number: string
  status_history: StatusHistoryEntry[]
}

interface ServiceOrderStatusHistoryWidgetProps {
  data: ServiceOrder
}

const ServiceOrderStatusHistoryWidget = ({ data: serviceOrder }: ServiceOrderStatusHistoryWidgetProps) => {
  if (!serviceOrder) {
    return null
  }

  const statusHistory = serviceOrder.status_history || []
  
  // Sort status history by date (newest first)
  const sortedHistory = [...statusHistory].sort((a, b) => 
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  )

  const getStatusColor = (status: string): "red" | "orange" | "blue" | "green" | "purple" | "grey" => {
    const statusColors = {
      draft: "orange",
      scheduled: "blue",
      in_progress: "purple",
      waiting_parts: "orange",
      customer_approval: "orange",
      completed: "green",
      cancelled: "red",
    } as const

    return statusColors[status as keyof typeof statusColors] || "grey"
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Status History</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {statusHistory.length} status change{statusHistory.length !== 1 ? 's' : ''} recorded
            </Text>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {sortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ChevronDownMini className="w-12 h-12 text-ui-fg-muted mb-4" />
            <Text className="text-ui-fg-muted mb-2">No status changes recorded</Text>
            <Text size="small" className="text-ui-fg-subtle">
              Status changes will appear here as they occur
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell><Label size="small" weight="plus">From</Label></Table.HeaderCell>
                <Table.HeaderCell><Label size="small" weight="plus">To</Label></Table.HeaderCell>
                <Table.HeaderCell><Label size="small" weight="plus">Changed By</Label></Table.HeaderCell>
                <Table.HeaderCell><Label size="small" weight="plus">Reason</Label></Table.HeaderCell>
                <Table.HeaderCell><Label size="small" weight="plus">Date</Label></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortedHistory.map((history: StatusHistoryEntry) => (
                <Table.Row key={history.id}>
                  <Table.Cell>
                    {history.from_status ? (
                      <Badge 
                        size="2xsmall" 
                        color={getStatusColor(history.from_status)}
                      >
                        {history.from_status.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <Text size="small" className="text-ui-fg-muted">-</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge 
                      size="2xsmall" 
                      color={getStatusColor(history.to_status)}
                    >
                      {history.to_status.replace('_', ' ')}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{history.changed_by}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className={history.reason ? '' : 'text-ui-fg-muted'}>
                      {history.reason || 'No reason provided'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {new Date(history.changed_at).toLocaleString()}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export default ServiceOrderStatusHistoryWidget