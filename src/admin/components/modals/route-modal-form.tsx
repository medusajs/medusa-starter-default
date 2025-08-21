import { PropsWithChildren } from "react"
import { FieldValues, UseFormReturn } from "react-hook-form"

interface RouteModalFormProps<TFieldValues extends FieldValues> extends PropsWithChildren {
  form: UseFormReturn<TFieldValues>
}

export const RouteModalForm = <TFieldValues extends FieldValues = any>({
  form,
  children,
}: RouteModalFormProps<TFieldValues>) => {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {children}
    </form>
  )
}