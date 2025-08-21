import { useCustomTranslation } from "../../hooks/use-custom-translation"

// This component will be used by the handle export
export const TechniciansBreadcrumb = () => {
  const { t } = useCustomTranslation()
  
  return <span>{t("custom.technicians.title")}</span>
}
