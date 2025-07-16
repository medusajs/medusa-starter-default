import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validate required fields
    const { customer_id, email, region_id, currency_code, sales_channel_id, items, shipping_address, billing_address, ...rest } = req.body as any
    
    if (!customer_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Customer ID is required" 
      })
    }

    if (!email) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Email is required" 
      })
    }

    if (!region_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Region ID is required" 
      })
    }

    if (!currency_code) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Currency code is required" 
      })
    }

    if (!sales_channel_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Sales channel ID is required" 
      })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Items are required" 
      })
    }

    if (!shipping_address) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Shipping address is required" 
      })
    }

    if (!billing_address) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Billing address is required" 
      })
    }

    // Prepare order data
    const orderData = {
      customer_id,
      email,
      region_id,
      currency_code,
      sales_channel_id,
      items,
      shipping_address,
      billing_address,
      metadata: {
        created_via: 'admin-api',
        source: 'order-creation-endpoint',
        ...rest.metadata
      },
      ...rest
    }

    // Create order using workflow
    const { result: order } = await createOrderWorkflow(req.scope).run({
      input: orderData
    })
    
    res.status(201).json({ order })
  } catch (error) {
    console.error("Error creating order:", error)
    res.status(500).json({ 
      error: "Failed to create order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}