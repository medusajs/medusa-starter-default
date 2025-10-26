import { z } from "zod"

/**
 * Address schema for billing and shipping addresses
 */
const AddressSchema = z.object({
  id: z.string().optional(),
  address_1: z.string().min(1, "Address line 1 is required"),
  address_2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country_code: z.string().length(2, "Country code must be 2 characters"),
  province: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
})

/**
 * Validation schema for creating an offer
 * Follows MedusaJS v2 best practices using Zod
 */
export const PostAdminCreateOfferSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  customer_email: z.string().email("Valid email is required"),
  customer_phone: z.string().optional(),
  offer_date: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  currency_code: z.string().length(3, "Currency code must be 3 characters").optional(),
  billing_address: AddressSchema,
  shipping_address: AddressSchema.optional(),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type PostAdminCreateOfferSchemaType = z.infer<typeof PostAdminCreateOfferSchema>
