import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Drawer,
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
import { useEffect, useState } from "react"

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

interface Technician {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  employee_id?: string
  department?: string
  position?: string
  hire_date?: string
  certification_level?: string
  certifications?: string
  specializations?: string
  hourly_rate?: string
  salary?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  status: "active" | "inactive" | "on_leave"
  notes?: string
  created_at: string
  updated_at: string
}

interface EditTechnicianFormProps {
  technician: Technician
  trigger?: React.ReactNode
}

export const EditTechnicianForm = ({ technician, trigger }: EditTechnicianFormProps) => {
  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  console.log("EditTechnicianForm rendered with technician:", technician)
  console.log("Drawer open state:", isDrawerOpen)
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: technician?.first_name || "",
      last_name: technician?.last_name || "",
      email: technician?.email || "",
      phone: technician?.phone || "",
      employee_id: technician?.employee_id || "",
      department: technician?.department || "",
      position: technician?.position || "",
      hire_date: technician?.hire_date || "",
      certification_level: technician?.certification_level || "",
      certifications: technician?.certifications || "",
      specializations: technician?.specializations || "",
      hourly_rate: technician?.hourly_rate || "",
      salary: technician?.salary || "",
      address: technician?.address || "",
      emergency_contact_name: technician?.emergency_contact_name || "",
      emergency_contact_phone: technician?.emergency_contact_phone || "",
      status: technician?.status || "active",
      notes: technician?.notes || "",
    },
  })

  // Update form values when technician data changes
  useEffect(() => {
    if (technician) {
      console.log("Populating form with technician data:", technician)
      form.reset({
        first_name: technician.first_name || "",
        last_name: technician.last_name || "",
        email: technician.email || "",
        phone: technician.phone || "",
        employee_id: technician.employee_id || "",
        department: technician.department || "",
        position: technician.position || "",
        hire_date: technician.hire_date || "",
        certification_level: technician.certification_level || "",
        certifications: technician.certifications || "",
        specializations: technician.specializations || "",
        hourly_rate: technician.hourly_rate || "",
        salary: technician.salary || "",
        address: technician.address || "",
        emergency_contact_name: technician.emergency_contact_name || "",
        emergency_contact_phone: technician.emergency_contact_phone || "",
        status: technician.status || "active",
        notes: technician.notes || "",
      })
    }
  }, [technician, form])

  // Also populate form when drawer opens
  useEffect(() => {
    if (isDrawerOpen && technician) {
      console.log("Drawer opened, populating form with technician data:", technician)
      form.reset({
        first_name: technician.first_name || "",
        last_name: technician.last_name || "",
        email: technician.email || "",
        phone: technician.phone || "",
        employee_id: technician.employee_id || "",
        department: technician.department || "",
        position: technician.position || "",
        hire_date: technician.hire_date || "",
        certification_level: technician.certification_level || "",
        certifications: technician.certifications || "",
        specializations: technician.specializations || "",
        hourly_rate: technician.hourly_rate || "",
        salary: technician.salary || "",
        address: technician.address || "",
        emergency_contact_name: technician.emergency_contact_name || "",
        emergency_contact_phone: technician.emergency_contact_phone || "",
        status: technician.status || "active",
        notes: technician.notes || "",
      })
    }
  }, [isDrawerOpen, technician, form])

  const updateTechnicianMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/admin/technicians/${technician.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update technician")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Technician updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["technicians"] })
      queryClient.invalidateQueries({ queryKey: ["technician", technician.id] })
      setIsDrawerOpen(false)
    },
    onError: (error) => {
      toast.error("Failed to update technician. Please try again.")
      console.error("Error updating technician:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    updateTechnicianMutation.mutate(data)
  })

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <Drawer.Trigger asChild>
        {trigger || <Button>Edit Technician</Button>}
      </Drawer.Trigger>
      <Drawer.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Drawer.Header>
              <Heading className="capitalize">
                Edit Technician
              </Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
              
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
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Drawer.Close asChild>
                  <Button size="small" variant="secondary">
                    Cancel
                  </Button>
                </Drawer.Close>
                <Button 
                  size="small" 
                  type="submit"
                  disabled={updateTechnicianMutation.isPending}
                >
                  {updateTechnicianMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  )
} 