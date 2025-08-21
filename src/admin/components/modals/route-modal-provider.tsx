import { createContext, useContext, PropsWithChildren } from "react"

interface RouteModalContextType {
  handleSuccess: () => void
  handleCancel: () => void
  __internal: {
    closeOnEscape: boolean
  }
}

const RouteModalContext = createContext<RouteModalContextType | null>(null)

export const useRouteModal = () => {
  const context = useContext(RouteModalContext)
  if (!context) {
    throw new Error("useRouteModal must be used within RouteModalProvider")
  }
  return context
}