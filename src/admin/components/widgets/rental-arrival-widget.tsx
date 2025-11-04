/**
 * Rental Arrival Widget
 *
 * Displays arrival/return information for a rental:
 * - Expected return date
 * - Actual return date
 * - End machine hours
 * - Return notes
 */

import { Container, Heading, Text, Label, Badge, Button } from "@medusajs/ui"

interface RentalArrivalWidgetProps {
  data: {
    expected_return_date: string
    actual_return_date?: string
    end_machine_hours?: number
    return_notes?: string
    status: string
    total_hours_used: number
  }
  onSetEndHours?: () => void
}

const RentalArrivalWidget = ({ data, onSetEndHours }: RentalArrivalWidgetProps) => {
  const formatDate = (date?: string) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOverdue = data.expected_return_date && !data.actual_return_date &&
    new Date(data.expected_return_date) < new Date()

  const getStatusBadge = () => {
    if (data.status === "completed") {
      return { color: "green" as const, label: "Returned" }
    }
    if (data.status === "active") {
      if (isOverdue) {
        return { color: "red" as const, label: "Overdue" }
      }
      return { color: "orange" as const, label: "Out" }
    }
    return { color: "grey" as const, label: data.status }
  }

  const statusBadge = getStatusBadge()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Arrival</Heading>
        <Badge size="small" color={statusBadge.color}>
          {statusBadge.label}
        </Badge>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-4">
          {/* Expected Return Date */}
          <div>
            <Label size="small" weight="plus" className="mb-2">
              Expected Return Date
            </Label>
            <Text size="base">
              {formatDate(data.expected_return_date)}
            </Text>
            {isOverdue && (
              <Text size="small" className="text-ui-fg-error mt-1">
                Overdue
              </Text>
            )}
          </div>

          {/* Actual Return Date */}
          <div>
            <Label size="small" weight="plus" className="mb-2">
              Actual Return Date
            </Label>
            {data.actual_return_date ? (
              <Text size="base">
                {formatDate(data.actual_return_date)}
              </Text>
            ) : (
              <Text size="small" className="text-ui-fg-muted">
                Not yet returned
              </Text>
            )}
          </div>

          {/* End Machine Hours */}
          <div>
            <Label size="small" weight="plus" className="mb-2">
              End Machine Hours
            </Label>
            {data.end_machine_hours !== undefined && data.end_machine_hours !== null ? (
              <div className="space-y-2">
                <Text size="xlarge" weight="plus" className="text-ui-fg-interactive">
                  {data.end_machine_hours.toLocaleString()} hrs
                </Text>
                {data.total_hours_used > 0 && (
                  <div className="bg-ui-bg-subtle rounded-md p-2">
                    <Text size="small" className="text-ui-fg-subtle">
                      Total hours used: <span className="font-semibold">{data.total_hours_used} hrs</span>
                    </Text>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {data.status === "active" && onSetEndHours ? (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={onSetEndHours}
                  >
                    Set End Hours
                  </Button>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">
                    Not recorded
                  </Text>
                )}
              </div>
            )}
          </div>

          {/* Return Notes */}
          {data.return_notes && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Return Notes
              </Label>
              <div className="bg-ui-bg-subtle rounded-md p-3">
                <Text size="small" className="whitespace-pre-wrap">
                  {data.return_notes}
                </Text>
              </div>
            </div>
          )}

          {!data.return_notes && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Return Notes
              </Label>
              <Text size="small" className="text-ui-fg-muted">
                No return notes recorded
              </Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

export default RentalArrivalWidget
