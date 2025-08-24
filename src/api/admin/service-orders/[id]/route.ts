import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../modules/service-orders"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    
    console.log(`Fetching service order: ${id}`)
    
    const serviceOrder = await serviceOrdersService.getServiceOrdersWithItems(id)
    
    if (!serviceOrder) {
      return res.status(404).json({ 
        error: "Service order not found" 
      })
    }
    
    console.log(`Service order status: ${serviceOrder.status}`)
    
    res.json({ service_order: serviceOrder })
  } catch (error) {
    console.error("Error fetching service order:", error)
    res.status(500).json({ 
      error: "Failed to fetch service order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    
    console.log("Updating service order:", id)
    console.log("Update data:", req.body)
    
    const updatedServiceOrders = await serviceOrdersService.updateServiceOrders({
      id,
      ...(req.body as any),
    })
    
    console.log("Updated service order result:", updatedServiceOrders)
    
    // Extract the first item from the array since updateServiceOrders returns an array
    const updatedServiceOrder = Array.isArray(updatedServiceOrders) ? updatedServiceOrders[0] : updatedServiceOrders
    
    res.json({ service_order: updatedServiceOrder })
  } catch (error) {
    console.error("Error updating service order:", error)
    res.status(500).json({ 
      error: "Failed to update service order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    
    await serviceOrdersService.deleteServiceOrders([id])
    
    res.status(200).json({ 
      id,
      deleted: true 
    })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to delete service order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 