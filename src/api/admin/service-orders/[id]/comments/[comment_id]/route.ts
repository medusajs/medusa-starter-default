import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SERVICE_ORDERS_MODULE } from "../../../../../../modules/service-orders"
import { UpdateServiceOrderCommentDTO } from "../../../../../../modules/service-orders/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { comment_id } = req.params
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    const comment = await serviceOrdersService.retrieveServiceOrderComment(comment_id)
    
    if (!comment) {
      return res.status(404).json({ 
        error: "Comment not found",
        details: `Comment with ID ${comment_id} does not exist`
      })
    }
    
    res.json({ comment })
  } catch (error) {
    console.error("Error fetching service order comment:", error)
    res.status(500).json({ 
      error: "Failed to fetch comment",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { comment_id } = req.params
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    // Validate that comment exists
    const existingComment = await serviceOrdersService.retrieveServiceOrderComment(comment_id)
    if (!existingComment) {
      return res.status(404).json({ 
        error: "Comment not found",
        details: `Comment with ID ${comment_id} does not exist`
      })
    }

    const { message, is_pinned, metadata } = req.body as Partial<Pick<UpdateServiceOrderCommentDTO, 'message' | 'is_pinned' | 'metadata'>>

    const updateData: UpdateServiceOrderCommentDTO = {
      id: comment_id,
      ...(message !== undefined && { message }),
      ...(is_pinned !== undefined && { is_pinned }),
      ...(metadata !== undefined && { metadata })
    }

    // Validate message if provided
    if (updateData.message !== undefined && (!updateData.message || updateData.message.trim().length === 0)) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Message cannot be empty" 
      })
    }

    // Trim message if provided
    if (updateData.message) {
      updateData.message = updateData.message.trim()
    }

    const comment = await serviceOrdersService.updateServiceOrderComment(updateData)
    
    res.json({ comment })
  } catch (error) {
    console.error("Error updating service order comment:", error)
    res.status(500).json({ 
      error: "Failed to update comment",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { comment_id } = req.params
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    // Validate that comment exists
    const existingComment = await serviceOrdersService.retrieveServiceOrderComment(comment_id)
    if (!existingComment) {
      return res.status(404).json({ 
        error: "Comment not found",
        details: `Comment with ID ${comment_id} does not exist`
      })
    }

    await serviceOrdersService.deleteServiceOrderComment(comment_id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting service order comment:", error)
    res.status(500).json({ 
      error: "Failed to delete comment",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 