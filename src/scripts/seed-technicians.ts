import { ExecArgs } from "@medusajs/framework/types"
import { TECHNICIANS_MODULE } from "../modules/technicians"

export default async function seedTechnicians({ container }: ExecArgs) {
  const techniciansService = container.resolve(TECHNICIANS_MODULE)
  
  const sampleTechnicians = [
    {
      first_name: "John",
      last_name: "Smith",
      email: "john.smith@company.com",
      phone: "+1-555-0101",
      employee_id: "EMP001",
      department: "Field Service",
      position: "Senior Technician",
      hire_date: "2020-01-15",
      certification_level: "Level 3",
      certifications: "ASE Master Technician, Hydraulics Specialist",
      specializations: "Heavy Equipment, Hydraulic Systems",
      hourly_rate: "35.00",
      address: "123 Main St, Anytown, ST 12345",
      emergency_contact_name: "Jane Smith",
      emergency_contact_phone: "+1-555-0102",
      status: "active" as const,
      notes: "Excellent performance record, specializes in complex hydraulic repairs"
    },
    {
      first_name: "Maria",
      last_name: "Garcia",
      email: "maria.garcia@company.com",
      phone: "+1-555-0201",
      employee_id: "EMP002",
      department: "Workshop",
      position: "Lead Technician",
      hire_date: "2019-03-10",
      certification_level: "Level 4",
      certifications: "Diesel Engine Specialist, Electrical Systems",
      specializations: "Engine Diagnostics, Electrical Troubleshooting",
      hourly_rate: "38.00",
      address: "456 Oak Ave, Somewhere, ST 67890",
      emergency_contact_name: "Carlos Garcia",
      emergency_contact_phone: "+1-555-0202",
      status: "active" as const,
      notes: "Team lead with excellent mentoring skills"
    },
    {
      first_name: "David",
      last_name: "Johnson",
      email: "david.johnson@company.com",
      phone: "+1-555-0301",
      employee_id: "EMP003",
      department: "Field Service",
      position: "Technician",
      hire_date: "2021-06-20",
      certification_level: "Level 2",
      certifications: "Basic Hydraulics, Safety Training",
      specializations: "Preventive Maintenance, Basic Repairs",
      hourly_rate: "28.00",
      address: "789 Pine St, Elsewhere, ST 11111",
      emergency_contact_name: "Sarah Johnson",
      emergency_contact_phone: "+1-555-0302",
      status: "active" as const,
      notes: "Reliable technician, good with routine maintenance"
    },
    {
      first_name: "Lisa",
      last_name: "Chen",
      email: "lisa.chen@company.com",
      phone: "+1-555-0401",
      employee_id: "EMP004",
      department: "Workshop",
      position: "Apprentice Technician",
      hire_date: "2022-09-01",
      certification_level: "Level 1",
      certifications: "Safety Training, Basic Tools",
      specializations: "Learning Phase",
      hourly_rate: "22.00",
      address: "321 Elm St, Newtown, ST 22222",
      emergency_contact_name: "Michael Chen",
      emergency_contact_phone: "+1-555-0402",
      status: "active" as const,
      notes: "New apprentice, showing great potential"
    },
    {
      first_name: "Robert",
      last_name: "Wilson",
      email: "robert.wilson@company.com",
      phone: "+1-555-0501",
      employee_id: "EMP005",
      department: "Field Service",
      position: "Senior Technician",
      hire_date: "2018-11-05",
      certification_level: "Level 3",
      certifications: "Welding Specialist, Heavy Equipment",
      specializations: "Welding, Fabrication, Emergency Repairs",
      hourly_rate: "36.00",
      address: "654 Maple Dr, Oldtown, ST 33333",
      emergency_contact_name: "Patricia Wilson",
      emergency_contact_phone: "+1-555-0502",
      status: "on_leave" as const,
      notes: "Currently on medical leave, expected return in 2 weeks"
    }
  ]

  console.log("Seeding sample technicians...")
  
  for (const technicianData of sampleTechnicians) {
    try {
      await techniciansService.createTechnician(technicianData)
      console.log(`Created technician: ${technicianData.first_name} ${technicianData.last_name}`)
    } catch (error) {
      console.error(`Failed to create technician ${technicianData.first_name} ${technicianData.last_name}:`, error)
    }
  }
  
  console.log("Finished seeding technicians!")
} 