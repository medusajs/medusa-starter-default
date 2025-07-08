import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE, MachinesModuleService } from "../../../modules/machines"
import { createI18nContext } from "../../../utils/i18n-helper"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService: MachinesModuleService = req.scope.resolve(MACHINES_MODULE)
    const query = req.scope.resolve("query")
    const i18nContext = createI18nContext(req)
    
    const { 
      limit = 50, 
      offset = 0,
      ...filters 
    } = req.query
    
    // Use query.graph to get machines with their brand relationships
    const { data: machines, metadata } = await query.graph({
      entity: "machine",
      fields: ["*", "brand.*"],
      filters,
      pagination: {
        take: Number(limit),
        skip: Number(offset),
      },
    })
    
    // Add localized status to each machine
    const localizedMachines = machines.map(machine => ({
      ...machine,
      localizedStatus: (machinesService as any).t(`machine.status.${machine.status}`, i18nContext.language)
    }))
    
    // Get count using the generated method
    const [, count] = await machinesService.listAndCountMachines(filters, {
      take: Number(limit),
      skip: Number(offset),
    })
    
    res.json({
      machines: localizedMachines,
      count,
      offset: Number(offset),
      limit: Number(limit),
      language: i18nContext.language,
    })
  } catch (error) {
    console.error("Error fetching machines:", error)
    res.status(500).json({ 
      error: "Failed to fetch machines",
      details: error.message 
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService: MachinesModuleService = req.scope.resolve(MACHINES_MODULE)
    const linkService = req.scope.resolve("linkService")
    const i18nContext = createI18nContext(req)
    
    const body = req.body as any
    const { brand_id, ...machineData } = body
    
    // Validate required fields
    if (!brand_id) {
      return res.status(400).json({
        error: "Missing required field",
        details: "brand_id is required"
      })
    }
    
    // Create the machine using the i18n-aware method
    const machine = await (machinesService as any).createMachineWithI18n(
      machineData, 
      i18nContext
    )
    
    // Create the machine-brand link
    if (brand_id) {
      await (linkService as any).create({
        [MACHINES_MODULE]: {
          machine_id: machine.id,
        },
        brands: {
          brand_id: brand_id,
        },
      })
    }
    
    // Get localized success message
    const successMessage = (machinesService as any).t(
      "machine.message.created", 
      i18nContext.language,
      "Machine created successfully"
    )
    
    res.status(201).json({
      machine,
      message: successMessage,
      language: i18nContext.language,
    })
  } catch (error) {
    console.error("Error creating machine:", error)
    res.status(500).json({ 
      error: "Failed to create machine",
      details: error.message 
    })
  }
} 