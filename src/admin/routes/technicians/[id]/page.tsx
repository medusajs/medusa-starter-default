import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, PencilSquare, User } from "@medusajs/icons"
import { Button, Heading, StatusBadge, Text, Container } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { useCustomTranslation } from "../../../hooks/use-custom-translation"
import { EditTechnicianForm } from "../../../components/edit-technician-form"
import TechnicianOpenServiceOrdersWidget from "../../../components/widgets/technician-open-service-orders-widget"

// Technician interface matching the model
interface Technician {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  employee_id?: string
  department?: string
  position?: string
  hire_date?: string
  certification_level?: string
  certifications?: string
  specializations?: string
  hourly_rate?: string
  salary?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  status: "active" | "inactive" | "on_leave"
  notes?: string
  created_at: string
  updated_at: string
}

const TechnicianDetails = () => {
  const { id } = useParams()
  const { t } = useCustomTranslation()

  const { data: technician, isLoading, error } = useQuery({
    queryKey: ["technician", id],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians/${id}`)
      if (!response.ok) throw new Error("Failed to fetch technician")
      const data = await response.json()
      return data.technician as Technician
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !technician) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  const statusVariants = {
    active: "green",
    inactive: "red",
    on_leave: "orange",
  } as const

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A"
    return new Intl.DateTimeFormat("nl-BE", {
      year: "numeric",
      month: "2-digit", 
      day: "2-digit",
    }).format(new Date(dateString))
  }

  const formatCurrency = (amount?: string | null) => {
    if (!amount) return "€0,00"
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return "€0,00"
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: "EUR",
    }).format(numAmount)
  }

  const getDepartmentLabel = (dept?: string | null) => {
    if (!dept) return "N/A"
    const deptLabels = {
      service: t("custom.technicians.departments.service"),
      maintenance: t("custom.technicians.departments.maintenance"),
      support: t("custom.technicians.departments.support"),
      field_service: t("custom.technicians.departments.field_service"),
    }
    return deptLabels[dept as keyof typeof deptLabels] || dept
  }

  const getCertificationLabel = (cert?: string | null) => {
    if (!cert) return "N/A"
    const certLabels = {
      entry: t("custom.technicians.certifications.entry"),
      intermediate: t("custom.technicians.certifications.intermediate"),
      advanced: t("custom.technicians.certifications.advanced"),
      expert: t("custom.technicians.certifications.expert"),
    }
    return certLabels[cert as keyof typeof certLabels] || cert
  }

  return (
    <div className="flex w-full flex-col gap-y-3">
      {/* Header Section */}
      <Container>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button size="small" variant="transparent" asChild>
              <Link to="/technicians">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Heading level="h1">
                  {technician.first_name} {technician.last_name}
                </Heading>
                <StatusBadge color={statusVariants[technician.status]}>
                  {t(`custom.technicians.status.${technician.status}`)}
                </StatusBadge>
              </div>
              <Text className="text-ui-fg-subtle">
                {technician.position || "Technician"} • {getDepartmentLabel(technician.department)}
              </Text>
            </div>
          </div>
                     <EditTechnicianForm 
                       technician={technician}
                       trigger={
                         <Button size="small" variant="secondary">
                           <PencilSquare className="w-4 h-4 mr-2" />
                           {t("custom.general.edit")}
                         </Button>
                       }
                     />
        </div>
      </Container>

      {/* Main Content with TwoColumnPage */}
      <TwoColumnPage
        widgets={{
          before: [],
          after: [],
          sideAfter: [],
          sideBefore: [TechnicianOpenServiceOrdersWidget],
        }}
        data={technician}
        hasOutlet={false}
        showJSON={false}
        showMetadata={false}
      >
        <TwoColumnPage.Main>
          {/* Personal Information */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">
                Personal Information
              </Heading>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Employee ID
                    </Text>
                    <Text>{technician.employee_id || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Position
                    </Text>
                    <Text>{technician.position || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Department
                    </Text>
                    <Text>{getDepartmentLabel(technician.department)}</Text>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Hire Date
                    </Text>
                    <Text>{formatDate(technician.hire_date)}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Status
                    </Text>
                    <StatusBadge color={statusVariants[technician.status]}>
                      {t(`custom.technicians.status.${technician.status}`)}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>
          </Container>

          {/* Contact Information */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">
                Contact Information
              </Heading>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Email
                    </Text>
                    <Text>{technician.email}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Phone
                    </Text>
                    <Text>{technician.phone || "N/A"}</Text>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Address
                    </Text>
                    <Text>{technician.address || "N/A"}</Text>
                  </div>
                </div>
              </div>
            </div>
          </Container>

          {/* Professional Information */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">
                Professional Information
              </Heading>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Certification Level
                    </Text>
                    <Text>{getCertificationLabel(technician.certification_level)}</Text>
                  </div>
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Specializations
                    </Text>
                    <Text>{technician.specializations || "N/A"}</Text>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Certifications
                    </Text>
                    <Text>{technician.certifications || "N/A"}</Text>
                  </div>
                </div>
              </div>
            </div>
          </Container>

          {/* Financial Information */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">
                Financial Information
              </Heading>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Hourly Rate
                    </Text>
                    <Text>{formatCurrency(technician.hourly_rate)}</Text>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Text size="small" weight="plus" className="text-ui-fg-subtle">
                      Salary
                    </Text>
                    <Text>{formatCurrency(technician.salary)}</Text>
                  </div>
                </div>
              </div>
            </div>
          </Container>

          {/* Notes Section */}
          {technician.notes && (
            <Container>
              <div className="px-6 py-4 border-b border-ui-border-base">
                <Heading level="h2">Notes</Heading>
              </div>
              <div className="px-6 py-4">
                <Text>{technician.notes}</Text>
              </div>
            </Container>
          )}
        </TwoColumnPage.Main>

        <TwoColumnPage.Sidebar>
          {/* Emergency Contact */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">
                Emergency Contact
              </Heading>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Name
                </Text>
                <Text>{technician.emergency_contact_name || "N/A"}</Text>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Phone
                </Text>
                <Text>{technician.emergency_contact_phone || "N/A"}</Text>
              </div>
            </div>
          </Container>

          {/* System Information */}
          <Container>
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">System Information</Heading>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Created
                </Text>
                <Text>{formatDate(technician.created_at)}</Text>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Last Updated
                </Text>
                <Text>{formatDate(technician.updated_at)}</Text>
              </div>
            </div>
          </Container>
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  )
}

// Loader function to fetch technician data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/technicians/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch technician")
    const data = await response.json()
    return data.technician
  } catch (error) {
    console.error("Error loading technician:", error)
    return null
  }
}

// Route config
export const config = defineRouteConfig({
  label: "Technician Details",
  icon: User,
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.first_name && data.last_name) {
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ")
      return fullName
    }
    return "Technician Details"
  },
}

export default TechnicianDetails
