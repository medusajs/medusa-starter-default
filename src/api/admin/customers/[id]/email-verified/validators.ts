import { z } from "@medusajs/framework/zod"

export const AdminSetEmailVerifiedSchema = z.object({
  verified: z.boolean(),
})

export type AdminSetEmailVerifiedSchema = z.infer<
  typeof AdminSetEmailVerifiedSchema
>
