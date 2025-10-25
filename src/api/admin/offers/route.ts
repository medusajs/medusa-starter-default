import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFER_MODULE } from "../../../modules/offers"
import { createOfferWorkflow } from "../../../workflows/offers/create-offer-workflow"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/offers
 * List all offers with filtering, pagination, and search
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerService: any = req.scope.resolve(OFFER_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const {
      status,
      customer_id,
      q,
      limit = 50,
      offset = 0,
      order = "created_at",
      direction = "DESC"
    } = req.query

    // Build filters
    const filters: any = {}
    if (status) filters.status = status
    if (customer_id) filters.customer_id = customer_id

    // Add search functionality
    if (q) {
      filters.$or = [
        { offer_number: { $ilike: `%${q}%` } },
        { customer_email: { $ilike: `%${q}%` } },
        { notes: { $ilike: `%${q}%` } },
      ]
    }

    // Get offers with related data using Remote Query
    const { data: offers, metadata } = await query.graph({
      entity: "offer",
      fields: [
        "id",
        "offer_number",
        "status",
        "offer_date",
        "valid_until",
        "total_amount",
        "currency_code",
        "customer_email",
        "created_at",
        "updated_at",
      ],
      filters,
      pagination: {
        skip: Number(offset),
        take: Number(limit),
        order: { [order as string]: direction },
      },
    })

    res.json({
      offers,
      count: metadata?.count || offers.length,
      offset: Number(offset),
      limit: Number(limit)
    })
  } catch (error) {
    console.error("Error fetching offers:", error)
    res.status(500).json({
      error: "Failed to fetch offers",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * POST /admin/offers
 * Create a new offer with auto-generated offer number
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const {
      customer_id,
      customer_email,
      customer_phone,
      offer_date,
      valid_until,
      currency_code,
      billing_address,
      shipping_address,
      notes,
      terms_and_conditions,
      metadata
    } = req.body

    // Validate required fields
    if (!customer_id || !customer_email) {
      return res.status(400).json({
        error: "Validation failed",
        details: "customer_id and customer_email are required"
      })
    }

    if (!billing_address) {
      return res.status(400).json({
        error: "Validation failed",
        details: "billing_address is required"
      })
    }

    // Create offer via workflow
    const { result } = await createOfferWorkflow(req.scope).run({
      input: {
        customer_id,
        customer_email,
        customer_phone,
        offer_date: offer_date ? new Date(offer_date) : undefined,
        valid_until: valid_until ? new Date(valid_until) : undefined,
        currency_code: currency_code || "EUR",
        billing_address,
        shipping_address,
        notes,
        terms_and_conditions,
        created_by: (req as any).user?.id || "system",
        metadata
      }
    })

    res.status(201).json({ offer: result })
  } catch (error) {
    console.error("Error creating offer:", error)
    res.status(500).json({
      error: "Failed to create offer",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
