import { useCustomTranslation } from "../../hooks/use-custom-translation"

// This component creates a breadcrumb path for the technicians module
export const TechnicianBreadcrumbPath = () => {
  const { t } = useCustomTranslation()
  
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <span className="hover:text-gray-900 cursor-pointer">
        {t("custom.technicians.title")}
      </span>
    </div>
  )
}

// For use in route handles
export const techniciansBreadcrumb = () => "Technicians"
export const technicianDetailBreadcrumb = (name?: string) => () => name || "Technician Details"
