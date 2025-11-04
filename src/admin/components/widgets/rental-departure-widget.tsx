/**
 * Rental Departure Widget
 *
 * Displays departure/pickup information for a rental:
 * - Start date
 * - Start machine hours
 * - Pickup notes
 */

import { Container, Heading, Text, Label, Badge } from "@medusajs/ui"

interface RentalDepartureWidgetProps {
  data: {
    rental_start_date: string
    start_machine_hours?: number
    pickup_notes?: string
    status: string
  }
}

const RentalDepartureWidget = ({ data }: RentalDepartureWidgetProps) => {
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

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Departure</Heading>
        <Badge size="small" color="blue">
          Pickup
        </Badge>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-4">
          {/* Start Date */}
          <div>
            <Label size="small" weight="plus" className="mb-2">
              Departure Date
            </Label>
            <Text size="base">
              {formatDate(data.rental_start_date)}
            </Text>
          </div>

          {/* Start Machine Hours */}
          <div>
            <Label size="small" weight="plus" className="mb-2">
              Start Machine Hours
            </Label>
            {data.start_machine_hours !== undefined && data.start_machine_hours !== null ? (
              <Text size="xlarge" weight="plus" className="text-ui-fg-interactive">
                {data.start_machine_hours.toLocaleString()} hrs
              </Text>
            ) : (
              <Text size="small" className="text-ui-fg-muted">
                Not recorded
              </Text>
            )}
          </div>

          {/* Pickup Notes */}
          {data.pickup_notes && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Pickup Notes
              </Label>
              <div className="bg-ui-bg-subtle rounded-md p-3">
                <Text size="small" className="whitespace-pre-wrap">
                  {data.pickup_notes}
                </Text>
              </div>
            </div>
          )}

          {!data.pickup_notes && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Pickup Notes
              </Label>
              <Text size="small" className="text-ui-fg-muted">
                No pickup notes recorded
              </Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

export default RentalDepartureWidget
