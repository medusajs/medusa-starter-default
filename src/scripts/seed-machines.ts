import { ExecArgs } from "@medusajs/framework/types"
import { MACHINES_MODULE } from "../modules/machines"

export default async function seedMachines({ container }: ExecArgs) {
  const machinesService = container.resolve(MACHINES_MODULE)
  
  const sampleMachines = [
    {
      model: "320D2",
      serial_number: "CAT0320D2001",
      year: 2020,
      hours: 1250,
      location: "Construction Site A",
      status: "operational",
      last_service_date: new Date("2023-01-15"),
      next_service_due: new Date("2023-07-15"),
      notes: "Regular maintenance completed",
    },
    {
      model: "PC200-8",
      serial_number: "KOM0200001",
      year: 2019,
      hours: 2100,
      location: "Warehouse B",
      status: "maintenance",
      last_service_date: new Date("2022-12-10"),
      next_service_due: new Date("2023-06-10"),
      notes: "Hydraulic system repair needed",
    },
    {
      model: "EC220E",
      serial_number: "VOL0220001",
      year: 2021,
      hours: 800,
      location: "Site C",
      status: "operational",
      last_service_date: new Date("2023-02-20"),
      next_service_due: new Date("2023-08-20"),
      notes: "New machine, minimal wear",
    },
    {
      model: "JS220",
      serial_number: "JCB0220001",
      year: 2018,
      hours: 3200,
      location: "Depot D",
      status: "out_of_service",
      last_service_date: new Date("2022-11-05"),
      next_service_due: new Date("2023-05-05"),
      notes: "Engine overhaul required",
    },
    {
      model: "R924",
      serial_number: "LIE0924001",
      year: 2022,
      hours: 450,
      location: "Project Site E",
      status: "operational",
      last_service_date: new Date("2023-03-01"),
      next_service_due: new Date("2023-09-01"),
      notes: "Under warranty, excellent condition",
    }
  ]
  
  console.log("Seeding machines...")
  
  for (const machineData of sampleMachines) {
    try {
      // Use the generated method from MedusaService
      const machine = await machinesService.createMachines(machineData)
      console.log(`Created machine: ${machine.model} (${machine.serial_number})`)
    } catch (error) {
      if (error.message && error.message.includes('unique')) {
        console.log(`Machine ${machineData.serial_number} already exists, skipping...`)
      } else {
        console.error(`Error creating machine ${machineData.serial_number}:`, error.message)
      }
    }
  }
  
  console.log("Finished seeding machines.")
} 