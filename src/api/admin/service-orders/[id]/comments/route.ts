import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SERVICE_ORDERS_MODULE } from "../../../../../modules/service-orders"
import { CreateServiceOrderCommentDTO } from "../../../../../modules/service-orders/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    const { threaded = "false" } = req.query

    let comments
    if (threaded === "true") {
      comments = await serviceOrdersService.getServiceOrderCommentsWithReplies(id)
    } else {
      comments = await serviceOrdersService.listServiceOrderComments({ service_order_id: id })
    }
    
    res.json({ comments })
  } catch (error) {
    console.error("Error fetching service order comments:", error)
    res.status(500).json({ 
      error: "Failed to fetch comments",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    // Validate required fields
    const { message, author_id, author_name, author_type = "user", service_order_id, ...rest } = req.body as CreateServiceOrderCommentDTO & { service_order_id?: string }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Message is required" 
      })
    }

    if (!author_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Author ID is required" 
      })
    }

    if (!author_name) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Author name is required" 
      })
    }

    const commentData: CreateServiceOrderCommentDTO = {
      message: message.trim(),
      author_id,
      author_name,
      author_type,
      service_order_id: id, // Use ID from URL params, not body
      ...rest
    }

    const comment = await serviceOrdersService.createServiceOrderComment(commentData)
    
    res.status(201).json({ comment })
  } catch (error) {
    console.error("Error creating service order comment:", error)
    res.status(500).json({ 
      error: "Failed to create comment",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 