import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../modules/rentals"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CreateRentalSchemaType } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService

    const {
      limit = 50,
      offset = 0,
      q,
      status,
      customer_id,
      machine_id,
      rental_type,
      start_date_gte,
      start_date_lte,
      end_date_gte,
      end_date_lte,
      ...filters
    } = req.query

    // Build filters
    const queryFilters: any = { ...filters }

    if (status) {
      queryFilters.status = Array.isArray(status) ? status : [status]
    }
    if (customer_id) queryFilters.customer_id = customer_id
    if (machine_id) queryFilters.machine_id = machine_id
    if (rental_type) queryFilters.rental_type = rental_type

    // Date range filters
    if (start_date_gte || start_date_lte) {
      queryFilters.rental_start_date = {}
      if (start_date_gte) queryFilters.rental_start_date.$gte = new Date(start_date_gte as string)
      if (start_date_lte) queryFilters.rental_start_date.$lte = new Date(start_date_lte as string)
    }

    if (end_date_gte || end_date_lte) {
      queryFilters.rental_end_date = {}
      if (end_date_gte) queryFilters.rental_end_date.$gte = new Date(end_date_gte as string)
      if (end_date_lte) queryFilters.rental_end_date.$lte = new Date(end_date_lte as string)
    }

    // Add search functionality
    if (q) {
      queryFilters.$or = [
        { rental_number: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
        { internal_notes: { $ilike: `%${q}%` } },
        { pickup_notes: { $ilike: `%${q}%` } },
        { return_notes: { $ilike: `%${q}%` } },
      ]
    }

    // TEM-203: Use Query API to get rentals with linked customer and machine data
    // This leverages the module links defined in:
    // - src/links/rental-customer.ts
    // - src/links/rental-machine.ts
    const { data: rentals, metadata } = await query.graph({
      entity: "rental",
      fields: [
        "*",
        "customer.*",  // Linked customer data
        "machine.*"    // Linked machine data
      ],
      filters: queryFilters,
      pagination: {
        take: Number(limit),
        skip: Number(offset),
      },
    })

    // Get count using the rentals service
    const [, count] = await rentalsService.listAndCountRentals(queryFilters, {
      take: Number(limit),
      skip: Number(offset),
    })

    res.json({
      rentals,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Error fetching rentals:", error)
    res.status(500).json({
      error: "Failed to fetch rentals",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * TEM-204: Create new rental order
 * POST /admin/rentals
 *
 * Validates request body using CreateRentalSchema (Zod)
 * Creates rental order via workflow with customer and machine links
 */
export async function POST(
  req: MedusaRequest<CreateRentalSchemaType>,
  res: MedusaResponse
) {
  try {
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService

    // TEM-204: Access validated body from middleware
    const rentalData = req.validatedBody

    // Create rental using service with proper field names
    // Note: Read-only links (customer_id, machine_id) are automatically handled
    // when the fields are set - no need for manual link.create()
    const rental = await rentalsService.createRentalWithNumber({
      customer_id: rentalData.customer_id,
      machine_id: rentalData.machine_id,
      rental_type: rentalData.rental_type,
      start_machine_hours: rentalData.start_machine_hours,
      hourly_rate: rentalData.hourly_rate,
      daily_rate: rentalData.daily_rate,
      rental_start_date: new Date(rentalData.rental_start_date),
      expected_return_date: new Date(rentalData.expected_return_date),
      description: rentalData.description,
      pickup_notes: rentalData.pickup_notes,
      deposit_amount: rentalData.deposit_amount,
      deposit_paid: rentalData.deposit_paid,
      created_by: rentalData.created_by,
      metadata: rentalData.metadata,
    })

    res.status(201).json({
      rental,
    })
  } catch (error) {
    console.error("Error creating rental:", error)

    res.status(500).json({
      error: "Failed to create rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}