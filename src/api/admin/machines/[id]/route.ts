import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE, MachinesModuleService } from "../../../../modules/machines"
import { BRANDS_MODULE } from "../../../../modules/brands"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    // Use query.graph to get machine with basic data for now
    // TODO: Add relationships once module links are properly configured
    const { data: machines } = await query.graph({
      entity: "machine",
      fields: ["*"],
      filters: { id },
    })
    
    if (!machines || machines.length === 0) {
      return res.status(404).json({
        error: "Machine not found"
      })
    }
    
    const machine = machines[0]
    
    // Populate brand information
    let machineWithBrand = { ...machine, brand_name: null as string | null, brand_code: null as string | null }
    if (machine.brand_id) {
      try {
        const brand = await brandsService.retrieveBrand(machine.brand_id)
        machineWithBrand = {
          ...machine,
          brand_name: brand.name,
          brand_code: brand.code
        }
      } catch (error) {
        console.warn(`Failed to fetch brand ${machine.brand_id}:`, error)
      }
    }
    
    res.json({
      machine: machineWithBrand
    })
  } catch (error) {
    console.error("Error fetching machine:", error)
    res.status(500).json({ 
      error: "Failed to fetch machine",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const machinesService = req.scope.resolve(MACHINES_MODULE) as MachinesModuleService
    
    const body = req.body as any
    const { customer_id, ...machineData } = body
    
    // Update the machine
    const machines = await machinesService.updateMachines({ id }, machineData)
    const machine = Array.isArray(machines) ? machines[0] : machines
    
    // TODO: Handle module links once they are properly configured
    // For now, if customer_id is provided, update it directly
    if (customer_id !== undefined) {
      await machinesService.updateMachines({ id }, { customer_id })
    }
    
    res.json({
      machine
    })
  } catch (error) {
    console.error("Error updating machine:", error)
    res.status(500).json({ 
      error: "Failed to update machine",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const machinesService = req.scope.resolve(MACHINES_MODULE) as MachinesModuleService
    
    // TODO: Remove module links once they are properly configured
    
    // Delete the machine
    await machinesService.deleteMachines([id])
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting machine:", error)
    res.status(500).json({ 
      error: "Failed to delete machine",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 