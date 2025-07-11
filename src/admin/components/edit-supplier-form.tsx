import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Drawer,
  Heading,
  Label,
  Input,
  Button,
  Text,
} from "@medusajs/ui"
import { FormProvider } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { Supplier } from "../routes/purchasing/suppliers/page"

const schema = zod.object({
  name: zod.string().min(1, "Name is required"),
  email: zod.string().email("A valid email is required").optional().or(zod.literal('')),
  phone: zod.string().optional(),
})

type FormData = zod.infer<typeof schema>

type EditSupplierFormProps = {
  supplier: Supplier
  trigger: React.ReactNode
}

export const EditSupplierForm = ({ supplier, trigger }: EditSupplierFormProps) => {
  const queryClient = useQueryClient()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
    },
  })

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}`, {
        method: "POST", // Medusa uses POST for updates
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update supplier")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Supplier updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (error) => {
      toast.error("Failed to update supplier. Please try again.")
      console.error("Error updating supplier:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    updateSupplierMutation.mutate(data)
  })

  return (
    <Drawer>
      <Drawer.Trigger asChild>
        {trigger}
      </Drawer.Trigger>
      <Drawer.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex h-full flex-col overflow-hidden"
          >
            <Drawer.Header>
              <Drawer.Title>
                Edit Supplier
              </Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <div className="flex flex-col gap-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && <Text className="text-red-500">{form.formState.errors.name.message}</Text>}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                  />
                   {form.formState.errors.email && <Text className="text-red-500">{form.formState.errors.email.message}</Text>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                  />
                </div>
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close asChild>
                  <Button variant="secondary">Cancel</Button>
              </Drawer.Close>
              <Button 
                type="submit"
                disabled={updateSupplierMutation.isPending}
              >
                {updateSupplierMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  )
} 