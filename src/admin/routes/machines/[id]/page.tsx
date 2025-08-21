import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, PencilSquare } from "@medusajs/icons"
import { Button, Heading, StatusBadge, Text, Container } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"

// Machine interface
interface Machine {
  id: string
  brand_name?: string | null
  brand_code?: string | null
  model_number: string
  serial_number: string
  year?: number | null
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: string | null
  purchase_price?: number | null
  current_value?: number | null
  status: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
  notes?: string | null
  customer_id?: string | null
  created_at: string
  updated_at: string
}

const MachineDetails = () => {
  const { id } = useParams()

  const { data: machine, isLoading, error } = useQuery({
    queryKey: ["machine", id],
    queryFn: async () => {
      const response = await fetch(`/admin/machines/${id}`)
      if (!response.ok) throw new Error("Failed to fetch machine")
      const data = await response.json()
      return data.machine as Machine
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !machine) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  const statusVariants = {
    active: "green",
    inactive: "grey",
    maintenance: "orange",
    sold: "red",
  } as const

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return "€0,00"
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A"
    return new Intl.DateTimeFormat("nl-BE", {
      year: "numeric",
      month: "2-digit", 
      day: "2-digit",
    }).format(new Date(dateString))
  }

  return (
    <div className="flex w-full flex-col gap-y-3">
      {/* Header Section */}
      <Container>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button size="small" variant="transparent" asChild>
              <Link to="/machines">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Heading level="h1">
                  {machine.brand_name || "Unknown Brand"} {machine.model_number}
                </Heading>
                <StatusBadge color={statusVariants[machine.status]}>
                  {machine.status}
                </StatusBadge>
              </div>
              <Text className="text-ui-fg-subtle">
                S/N: {machine.serial_number}
              </Text>
            </div>
          </div>
          <Button size="small" variant="secondary" asChild>
            <Link to={`/machines/${id}/edit`}>
              <PencilSquare className="w-4 h-4 mr-2" />
              Edit Machine
            </Link>
          </Button>
        </div>
      </Container>

      {/* Main Content with TwoColumnPage */}
      <TwoColumnPage
        widgets={{
          before: [],
          after: [],
          sideAfter: [],
          sideBefore: [],
        }}
        data={machine}
        hasOutlet={false}
        showJSON={false}
        showMetadata={false}
      >
        <TwoColumnPage.Main>
          {/* Machine Specifications */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">Specifications</Heading>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Model Number
                    </Text>
                    <Text>{machine.model_number}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Serial Number
                    </Text>
                    <Text>{machine.serial_number}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Year
                    </Text>
                    <Text>{machine.year || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Fuel Type
                    </Text>
                    <Text className="capitalize">{machine.fuel_type || "N/A"}</Text>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Engine Hours
                    </Text>
                    <Text>{machine.engine_hours ? `${machine.engine_hours} hrs` : "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Horsepower
                    </Text>
                    <Text>{machine.horsepower ? `${machine.horsepower} HP` : "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Weight
                    </Text>
                    <Text>{machine.weight ? `${machine.weight} kg` : "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Location
                    </Text>
                    <Text>{machine.location || "N/A"}</Text>
                  </div>
                </div>
              </div>
            </div>
          </Container>

          {/* Notes Section */}
          {machine.notes && (
            <Container>
              <div className="px-6 py-4 border-b border-ui-border-base">
                <Heading level="h2">Notes</Heading>
              </div>
              <div className="px-6 py-4">
                <Text>{machine.notes}</Text>
              </div>
            </Container>
          )}
        </TwoColumnPage.Main>

        <TwoColumnPage.Sidebar>
          {/* Machine Overview */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">Overview</Heading>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Brand
                </Text>
                <Text>{machine.brand_name || "Unknown Brand"}</Text>
                {machine.brand_code && (
                  <Text size="small" className="text-ui-fg-muted">
                    Code: {machine.brand_code}
                  </Text>
                )}
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Status
                </Text>
                <StatusBadge color={statusVariants[machine.status]}>
                  {machine.status}
                </StatusBadge>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Purchase Date
                </Text>
                <Text>{formatDate(machine.purchase_date)}</Text>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Purchase Price
                </Text>
                <Text>{formatCurrency(machine.purchase_price)}</Text>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Current Value
                </Text>
                <Text>{formatCurrency(machine.current_value)}</Text>
              </div>
            </div>
          </Container>

          {/* Machine History */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">History</Heading>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Created
                </Text>
                <Text>{formatDate(machine.created_at)}</Text>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Last Updated
                </Text>
                <Text>{formatDate(machine.updated_at)}</Text>
              </div>
            </div>
          </Container>
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  )
}

export default MachineDetails

// Loader function to fetch machine data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/machines/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch machine")
    const data = await response.json()
    return data.machine
  } catch (error) {
    console.error("Error loading machine:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Machine Details",
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.serial_number) {
      return data.serial_number
    }
    return "Machine Details"
  },
} 