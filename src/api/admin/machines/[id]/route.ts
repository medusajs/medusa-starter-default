import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE, MachinesModuleService } from "../../../../modules/machines"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    // Use query.graph to get machine with all its relationships
    const { data: machines } = await query.graph({
      entity: "machine",
      fields: [
        "*",
        "brand.*", // Include brand information
        "customer.*", // Include customer information  
        "service_orders.*", // Include service orders
      ],
      filters: { id },
    })
    
    if (!machines || machines.length === 0) {
      return res.status(404).json({
        error: "Machine not found"
      })
    }
    
    res.json({
      machine: machines[0]
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
    const linkService = req.scope.resolve("linkService") as any
    
    const body = req.body as any
    const { brand_id, customer_id, ...machineData } = body
    
    // Update the machine
    const [machine] = await machinesService.updateMachines({ id }, machineData)
    
    // Handle brand link updates
    if (brand_id !== undefined) {
      // Remove existing brand links for this machine
      await linkService.dismiss({
        machines: {
          machine_id: id,
        },
        brands: "*", // Remove all brand links for this machine
      })
      
      // Create new brand link if brand_id is provided
      if (brand_id) {
        await linkService.create({
          machines: {
            machine_id: id,
          },
          brands: {
            brand_id: brand_id,
          },
        })
      }
    }
    
    // Handle customer link updates
    if (customer_id !== undefined) {
      // Remove existing customer links for this machine
      await linkService.dismiss({
        machines: {
          machine_id: id,
        },
        customer: "*", // Remove all customer links for this machine
      })
      
      // Create new customer link if customer_id is provided
      if (customer_id) {
        await linkService.create({
          machines: {
            machine_id: id,
          },
          customer: {
            customer_id: customer_id,
          },
        })
      }
      
      // Also update the machine's customer_id field for backward compatibility
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
    const linkService = req.scope.resolve("linkService") as any
    
    // Remove all module links for this machine
    await linkService.dismiss({
      machines: {
        machine_id: id,
      },
      brands: "*",
    })
    
    await linkService.dismiss({
      machines: {
        machine_id: id,
      },
      customer: "*",
    })
    
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