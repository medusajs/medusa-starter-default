import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WARRANTIES_MODULE } from "../../../../modules/warranties"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const warrantiesService: any = req.scope.resolve(WARRANTIES_MODULE)
    const { id } = req.params
    
    console.log("Individual warranty API called for ID:", id)
    console.log("Warranties service resolved:", !!warrantiesService)
    
    // Try using the service directly first to debug
    try {
      const warranty = await warrantiesService.retrieveWarranty(id)
      console.log("Direct service call successful for warranty:", warranty?.id)
      
      if (!warranty) {
        return res.status(404).json({ 
          error: "Warranty not found",
          details: `Warranty with id ${id} does not exist`
        })
      }
      
      res.json(warranty)
    } catch (serviceError) {
      console.error("Direct service call failed:", serviceError)
      console.error("Available methods on warrantiesService:", Object.getOwnPropertyNames(warrantiesService))
      
      // Try alternative method names
      try {
        console.log("Trying retrieve method...")
        const warranty = await warrantiesService.retrieve(id)
        res.json(warranty)
      } catch (alternativeError) {
        console.error("Alternative method also failed:", alternativeError)
        return res.status(404).json({ 
          error: "Warranty not found",
          details: `Warranty with id ${id} does not exist or service method not available`
        })
      }
    }
  } catch (error) {
    console.error("Error fetching warranty:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack")
    res.status(500).json({ 
      error: "Failed to fetch warranty",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const warrantiesService: any = req.scope.resolve(WARRANTIES_MODULE)
    const { id } = req.params
    const updateData = req.body as any
    
    // Remove fields that shouldn't be updated directly
    const { id: _, warranty_number, created_at, updated_at, ...dataToUpdate } = updateData
    
    // Update warranty
    const updatedWarranty = await warrantiesService.updateWarranties(id, dataToUpdate)
    
    res.json(updatedWarranty)
  } catch (error) {
    console.error("Error updating warranty:", error)
    res.status(500).json({ 
      error: "Failed to update warranty",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const warrantiesService: any = req.scope.resolve(WARRANTIES_MODULE)
    const { id } = req.params
    
    // Delete warranty
    await warrantiesService.deleteWarranties(id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting warranty:", error)
    res.status(500).json({ 
      error: "Failed to delete warranty",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 