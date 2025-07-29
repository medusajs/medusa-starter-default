import { Text } from "@medusajs/ui"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

interface ServiceTypeLabelProps {
  serviceType: string
  size?: "small" | "base" | "large"
  weight?: "regular" | "plus"
}

const serviceTypeColors = {
  standard: "bg-ui-tag-green-bg text-ui-tag-green-text border-ui-tag-green-border",
  warranty: "bg-ui-tag-purple-bg text-ui-tag-purple-text border-ui-tag-purple-border", 
  sales_prep: "bg-ui-tag-orange-bg text-ui-tag-orange-text border-ui-tag-orange-border",
  internal: "bg-ui-tag-red-bg text-ui-tag-red-text border-ui-tag-red-border",
  insurance: "bg-ui-tag-blue-bg text-ui-tag-blue-text border-ui-tag-blue-border",
  quote: "bg-ui-tag-orange-bg text-ui-tag-orange-text border-ui-tag-orange-border",
} as const

export const ServiceTypeLabel = ({ 
  serviceType, 
  size = "small", 
  weight = "plus" 
}: ServiceTypeLabelProps) => {
  const { t } = useCustomTranslation()
  
  const colorClass = serviceTypeColors[serviceType as keyof typeof serviceTypeColors] || "bg-ui-tag-neutral-bg text-ui-tag-neutral-text border-ui-tag-neutral-border"
  const label = t(`custom.serviceOrders.types.${serviceType}`) || serviceType
  
  return (
    <Text 
      size={size} 
      weight={weight} 
      className={`inline-flex items-center px-2 py-1 rounded-md border ${colorClass}`}
    >
      {label}
    </Text>
  )
} 