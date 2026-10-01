import { z } from "@medusajs/framework/zod"

// Format is checked in the route (an invalid address answers
// `{ exists: false }` rather than 400, as before).
export const StoreEmailExistsSchema = z.object({
  email: z.string().trim().toLowerCase(),
})

export type StoreEmailExistsSchema = z.infer<typeof StoreEmailExistsSchema>
