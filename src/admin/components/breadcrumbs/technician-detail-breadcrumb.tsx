import { useCustomTranslation } from "../../hooks/use-custom-translation"

// This component will be used by the handle export
export const TechnicianDetailBreadcrumb = () => {
  const { t } = useCustomTranslation()
  
  // For dynamic breadcrumbs, you can access route params and data here
  // The actual technician data would be available through the route context
  return <span>{t("custom.technicians.technician")}</span>
}

// For use in route handles - this creates a breadcrumb function
export const createTechnicianDetailBreadcrumb = (technicianName?: string) => {
  return () => {
    if (technicianName) {
      return `Technicians - ${technicianName}`
    }
    return "Technicians - Technician Details"
  }
}

// Component that can be used within the page to show the full breadcrumb
export const TechnicianDetailBreadcrumbComponent = ({ technician }: { technician: any }) => {
  const { t } = useCustomTranslation()
  
  if (technician) {
    const fullName = [technician.first_name, technician.last_name].filter(Boolean).join(" ")
    return (
      <div className="text-sm text-gray-600 mb-4">
        <span className="hover:text-gray-900 cursor-pointer">Technicians</span>
        <span className="mx-2">-</span>
        <span>{fullName}</span>
      </div>
    )
  }
  
  return (
    <div className="text-sm text-gray-600 mb-4">
      <span className="hover:text-gray-900 cursor-pointer">Technicians</span>
      <span className="mx-2">-</span>
      <span>{t("custom.technicians.technician")}</span>
    </div>
  )
}
