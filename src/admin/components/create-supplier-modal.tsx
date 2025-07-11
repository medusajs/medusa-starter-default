import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FocusModal,
  Heading,
  Label,
  Input,
  Button,
  Text,
} from "@medusajs/ui"
import { FormProvider } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

const schema = zod.object({
  name: zod.string().min(1, "Name is required"),
  email: zod.string().email("A valid email is required").optional().or(zod.literal('')),
  phone: zod.string().optional(),
})

type FormData = zod.infer<typeof schema>

export const CreateSupplierModal = () => {
  const queryClient = useQueryClient()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  })

  const createSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/admin/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to create supplier")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Supplier created successfully!")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to create supplier. Please try again.")
      console.error("Error creating supplier:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createSupplierMutation.mutate(data)
  })

  return (
    <FocusModal>
      <FocusModal.Trigger asChild>
        <Button>Create Supplier</Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex h-full flex-col overflow-hidden"
          >
            <FocusModal.Header>
              <div className="flex items-center justify-end gap-x-2">
                <FocusModal.Close asChild>
                  <Button size="small" variant="secondary">
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button 
                  type="submit" 
                  size="small"
                  disabled={createSupplierMutation.isPending}
                >
                  {createSupplierMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="flex flex-1 flex-col items-center overflow-y-auto">
                <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                  <div>
                    <Heading>
                      Create Supplier
                    </Heading>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
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
                </div>
              </div>
            </FocusModal.Body>
          </form>
        </FormProvider>
      </FocusModal.Content>
    </FocusModal>
  )
} 