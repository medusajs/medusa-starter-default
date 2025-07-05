import { ExecArgs } from "@medusajs/framework/types"
import { MACHINES_MODULE } from "../modules/machines"

export default async function seedMachines({ container }: ExecArgs) {
  const machinesService = container.resolve(MACHINES_MODULE)
  
  const sampleMachines = [
    {
      brand: "Caterpillar",
      model: "320D",
      serial_number: "CAT320D001",
      year: "2020",
      engine_hours: "1250",
      fuel_type: "Diesel",
      horsepower: "158",
      weight: "20000",
      purchase_date: "2020-03-15",
      purchase_price: "150000",
      current_value: "125000",
      status: "active" as const,
      location: "Main Site",
      notes: "Excellent condition, recently serviced"
    },
    {
      brand: "Komatsu",
      model: "PC200",
      serial_number: "KOM200001",
      year: "2019",
      engine_hours: "2100",
      fuel_type: "Diesel",
      horsepower: "148",
      weight: "19500",
      purchase_date: "2019-08-20",
      purchase_price: "140000",
      current_value: "110000",
      status: "active" as const,
      location: "Site B",
      notes: "Good working condition"
    },
    {
      brand: "Volvo",
      model: "EC240",
      serial_number: "VOL240001",
      year: "2021",
      engine_hours: "800",
      fuel_type: "Diesel",
      horsepower: "177",
      weight: "24000",
      purchase_date: "2021-01-10",
      purchase_price: "175000",
      current_value: "155000",
      status: "maintenance" as const,
      location: "Workshop",
      notes: "Currently in for scheduled maintenance"
    },
    {
      brand: "JCB",
      model: "JS220",
      serial_number: "JCB220001",
      year: "2018",
      engine_hours: "3200",
      fuel_type: "Diesel",
      horsepower: "160",
      weight: "21500",
      purchase_date: "2018-05-12",
      purchase_price: "135000",
      current_value: "95000",
      status: "inactive" as const,
      location: "Storage",
      notes: "Needs major repairs"
    },
    {
      brand: "Hitachi",
      model: "ZX200",
      serial_number: "HIT200001",
      year: "2022",
      engine_hours: "450",
      fuel_type: "Diesel",
      horsepower: "141",
      weight: "19800",
      purchase_date: "2022-09-05",
      purchase_price: "165000",
      current_value: "160000",
      status: "active" as const,
      location: "Site C",
      notes: "Latest model, under warranty"
    }
  ]

  console.log("Seeding sample machines...")
  
  for (const machineData of sampleMachines) {
    try {
      await machinesService.createMachine(machineData)
      console.log(`Created machine: ${machineData.brand} ${machineData.model}`)
    } catch (error) {
      console.error(`Failed to create machine ${machineData.brand} ${machineData.model}:`, error)
    }
  }
  
  console.log("Finished seeding machines!")
} 