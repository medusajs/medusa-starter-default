import { PropsWithChildren, FormEvent } from "react"

interface KeyboundFormProps extends PropsWithChildren {
  onSubmit: (e: FormEvent) => void
  className?: string
}

export const KeyboundForm = ({ children, onSubmit, className }: KeyboundFormProps) => {
  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
    </form>
  )
}