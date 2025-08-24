import { ExecArgs } from "@medusajs/framework/types"
import { MACHINES_MODULE } from "../modules/machines"

export default async function seedMachines({ container }: ExecArgs) {
  const machinesService = container.resolve(MACHINES_MODULE)
  
  const sampleMachines = [
    {
      model_number: "320D2",
      serial_number: "CAT0320D2001",
      year: 2020,
      engine_hours: 1250,
      status: "active",
      notes: "Regular maintenance completed",
    },
    {
      model_number: "PC200-8",
      serial_number: "KOM0200001",
      year: 2019,
      engine_hours: 2100,
      status: "maintenance",
      notes: "Hydraulic system repair needed",
    },
    {
      model_number: "EC220E",
      serial_number: "VOL0220001",
      year: 2021,
      engine_hours: 800,
      status: "active",
      notes: "New machine, minimal wear",
    },
    {
      model_number: "JS220",
      serial_number: "JCB0220001",
      year: 2018,
      engine_hours: 3200,
      status: "inactive",
      notes: "Engine overhaul required",
    },
    {
      model_number: "R924",
      serial_number: "LIE0924001",
      year: 2022,
      engine_hours: 450,
      status: "active",
      notes: "Under warranty, excellent condition",
    }
  ]
  
  console.log("Seeding machines...")
  
  for (const machineData of sampleMachines) {
    try {
      // Use the generated method from MedusaService
      const machine = await machinesService.createMachines(machineData)
      console.log(`Created machine: ${machine.model_number} (${machine.serial_number})`)
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