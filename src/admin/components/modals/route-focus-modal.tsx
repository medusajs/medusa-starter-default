import { FocusModal, clx } from "@medusajs/ui"
import { PropsWithChildren, useEffect, useState, createContext, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { RouteModalForm } from "./route-modal-form"

interface RouteFocusModalProps extends PropsWithChildren {
  prev?: string
}

const Root = ({ prev = "..", children }: RouteFocusModalProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(true)
    return () => setOpen(false)
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate(prev, { replace: true })
      return
    }
    setOpen(open)
  }

  return (
    <FocusModal open={open} onOpenChange={handleOpenChange}>
      <RouteModalProvider prev={prev}>
        <FocusModal.Content>
          {children}
        </FocusModal.Content>
      </RouteModalProvider>
    </FocusModal>
  )
}

interface RouteModalContextType {
  handleSuccess: () => void
  handleCancel: () => void
  __internal: {
    closeOnEscape: boolean
  }
}

const RouteModalContext = createContext<RouteModalContextType | null>(null)

const useRouteModal = () => {
  const context = useContext(RouteModalContext)
  if (!context) {
    throw new Error("useRouteModal must be used within RouteModalProvider")
  }
  return context
}

const RouteModalProvider = ({ children, prev }: PropsWithChildren<{ prev: string }>) => {
  const navigate = useNavigate()
  
  const handleSuccess = () => {
    navigate(prev, { replace: true, state: { isSubmitSuccessful: true } })
  }

  const handleCancel = () => {
    navigate(prev, { replace: true })
  }

  return (
    <RouteModalContext.Provider value={{ handleSuccess, handleCancel, __internal: { closeOnEscape: true } }}>
      {children}
    </RouteModalContext.Provider>
  )
}

const Header = FocusModal.Header
const Title = FocusModal.Title
const Description = FocusModal.Description
const Footer = FocusModal.Footer
const Body = FocusModal.Body
const Close = FocusModal.Close
const Form = RouteModalForm

export const RouteFocusModal = Object.assign(Root, {
  Header,
  Title,
  Body,
  Description,
  Footer,
  Close,
  Form,
})