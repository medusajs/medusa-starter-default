import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FocusModal,
  Heading,
  Label,
  Input,
  Button,
  Select,
  Textarea,
} from "@medusajs/ui"
import {
  FormProvider,
  Controller,
} from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

const schema = zod.object({
  first_name: zod.string().min(1, "First name is required"),
  last_name: zod.string().min(1, "Last name is required"),
  email: zod.string().email("Valid email is required"),
  phone: zod.string().optional(),
  employee_id: zod.string().optional(),
  department: zod.string().optional(),
  position: zod.string().optional(),
  hire_date: zod.string().optional(),
  certification_level: zod.string().optional(),
  certifications: zod.string().optional(),
  specializations: zod.string().optional(),
  hourly_rate: zod.string().optional(),
  salary: zod.string().optional(),
  address: zod.string().optional(),
  emergency_contact_name: zod.string().optional(),
  emergency_contact_phone: zod.string().optional(),
  status: zod.enum(["active", "inactive", "on_leave"]),
  notes: zod.string().optional(),
})

type FormData = zod.infer<typeof schema>

export const CreateTechnicianForm = () => {
  const queryClient = useQueryClient()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      employee_id: "",
      department: "",
      position: "",
      hire_date: "",
      certification_level: "",
      certifications: "",
      specializations: "",
      hourly_rate: "",
      salary: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      status: "active",
      notes: "",
    },
  })

  const createTechnicianMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/admin/technicians", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to create technician")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Technician created successfully!")
      queryClient.invalidateQueries({ queryKey: ["technicians"] })
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to create technician. Please try again.")
      console.error("Error creating technician:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createTechnicianMutation.mutate(data)
  })

  return (
    <FocusModal>
      <FocusModal.Trigger asChild>
        <Button>Create Technician</Button>
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
                  disabled={createTechnicianMutation.isPending}
                >
                  {createTechnicianMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="flex flex-1 flex-col items-center overflow-y-auto">
                <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                  <div>
                    <Heading className="capitalize">
                      Create Technician
                    </Heading>
                  </div>
                  
                  {/* Personal Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="first_name"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            First Name *
                          </Label>
                          <Input {...field} />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="last_name"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Last Name *
                          </Label>
                          <Input {...field} />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Email *
                          </Label>
                          <Input {...field} type="email" />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Phone
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="employee_id"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Employee ID
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Status *
                          </Label>
                          <Select {...field}>
                            <Select.Trigger>
                              <Select.Value placeholder="Select status" />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="active">Active</Select.Item>
                              <Select.Item value="inactive">Inactive</Select.Item>
                              <Select.Item value="on_leave">On Leave</Select.Item>
                            </Select.Content>
                          </Select>
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Employment Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Department
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Position
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="hire_date"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Hire Date
                          </Label>
                          <Input {...field} type="date" />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="certification_level"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Certification Level
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Professional Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="certifications"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Certifications
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="specializations"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Specializations
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="hourly_rate"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Hourly Rate
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Salary
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Address
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <div></div>
                    
                    <Controller
                      control={form.control}
                      name="emergency_contact_name"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Emergency Contact Name
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="emergency_contact_phone"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Emergency Contact Phone
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Notes */}
                  <div className="grid grid-cols-1 gap-4">
                    <Controller
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Notes
                          </Label>
                          <Textarea {...field} />
                        </div>
                      )}
                    />
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