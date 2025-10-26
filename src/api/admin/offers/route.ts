import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFER_MODULE } from "../../../modules/offers"
import { createOfferWorkflow } from "../../../workflows/offers/create-offer-workflow"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PostAdminCreateOfferSchemaType } from "./validators"

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
        "customer_id",
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

    // Fetch customer details for all offers
    const customerIds = [...new Set(offers.map((o: any) => o.customer_id).filter(Boolean))]
    let customersMap = new Map()

    if (customerIds.length > 0) {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name", "email"],
        filters: { id: customerIds },
      })

      customersMap = new Map(customers.map((c: any) => [c.id, c]))
    }

    // Enrich offers with customer names
    const enrichedOffers = offers.map((offer: any) => {
      const customer = customersMap.get(offer.customer_id)
      return {
        ...offer,
        customer_name: customer
          ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email
          : null,
      }
    })

    res.json({
      offers: enrichedOffers,
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
 *
 * Uses Zod validation via validateAndTransformBody middleware
 * Validated data is accessed via req.validatedBody
 */
export async function POST(
  req: MedusaRequest<PostAdminCreateOfferSchemaType>,
  res: MedusaResponse
) {
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
    } = req.validatedBody

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
