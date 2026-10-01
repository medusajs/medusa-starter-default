import { z } from "@medusajs/framework/zod"

// Body sent by the storefront's /verify-email page (values from the mail link).
export const StoreVerifyEmailSchema = z.object({
  customer_id: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().min(1),
  token: z.string().min(1),
})

export type StoreVerifyEmailSchema = z.infer<typeof StoreVerifyEmailSchema>
