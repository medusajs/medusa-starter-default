import { z } from "zod"

/**
 * TEM-204: Zod Validation Schemas for Rentals API Routes
 *
 * These schemas validate incoming request bodies for rental management endpoints.
 * Based on the RentalOrder model structure and CreateRentalOrderDTO/UpdateRentalOrderDTO types.
 */

// Enum values from the rental model (TEM-202)
export const RentalStatusEnum = z.enum([
  "draft",
  "active",
  "completed",
  "cancelled",
])

export const RentalTypeEnum = z.enum([
  "hourly",
  "daily",
  "weekly",
  "monthly",
])

/**
 * TEM-204: Schema for POST /admin/rentals
 * Creates a new rental with hour-based machine tracking
 * Note: Uses .passthrough() to ignore extra fields from frontend (e.g., weekly_rate, monthly_rate)
 */
export const CreateRentalSchema = z.object({
  // Required fields
  customer_id: z.string().min(1, "Customer ID is required").optional(),
  machine_id: z.string().min(1, "Machine ID is required").optional(),
  rental_start_date: z.string().datetime("Start date must be a valid ISO datetime"),
  expected_return_date: z.string().datetime("Expected return date must be a valid ISO datetime"),
  hourly_rate: z.number().min(0, "Hourly rate must be non-negative"),

  // Optional rental details
  rental_type: RentalTypeEnum.optional(),
  daily_rate: z.number().min(0).optional(),
  start_machine_hours: z.number().min(0).optional(),
  deposit_amount: z.number().min(0).optional(),
  deposit_paid: z.boolean().optional(),

  // Additional info
  description: z.string().optional(),
  pickup_notes: z.string().optional(),
  return_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  created_by: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).passthrough()

export type CreateRentalSchemaType = z.infer<typeof CreateRentalSchema>

/**
 * TEM-204: Schema for PUT /admin/rentals/:id
 * Updates an existing rental (all fields optional)
 */
export const UpdateRentalSchema = z.object({
  // Optional fields
  customer_id: z.string().min(1).optional(),
  machine_id: z.string().min(1).optional(),
  rental_start_date: z.string().datetime().optional(),
  rental_end_date: z.string().datetime().optional(),
  expected_return_date: z.string().datetime().optional(),
  actual_return_date: z.string().datetime().optional(),

  rental_type: RentalTypeEnum.optional(),
  hourly_rate: z.number().min(0).optional(),
  daily_rate: z.number().min(0).optional(),

  start_machine_hours: z.number().min(0).optional(),
  end_machine_hours: z.number().min(0).optional(),

  deposit_amount: z.number().min(0).optional(),
  deposit_paid: z.boolean().optional(),

  // Additional info
  description: z.string().optional(),
  pickup_notes: z.string().optional(),
  return_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  updated_by: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type UpdateRentalSchemaType = z.infer<typeof UpdateRentalSchema>

/**
 * TEM-204: Schema for PUT /admin/rentals/:id/status
 * Updates the rental status with optional reason tracking
 */
export const UpdateStatusSchema = z.object({
  status: RentalStatusEnum,
  reason: z.string().optional(),
})

export type UpdateStatusSchemaType = z.infer<typeof UpdateStatusSchema>

/**
 * TEM-204: Schema for POST /admin/rentals/:id/return
 * Handles rental returns with machine hours tracking
 */
export const ReturnRentalSchema = z.object({
  actual_return_date: z.string().datetime().optional(),
  end_machine_hours: z.number().min(0, "End machine hours must be non-negative"),
  return_notes: z.string().optional(),
})

export type ReturnRentalSchemaType = z.infer<typeof ReturnRentalSchema>
