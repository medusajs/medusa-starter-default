import { z } from "@medusajs/framework/zod"

export const StoreIssueOrderTokenSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
})

export type StoreIssueOrderTokenSchema = z.infer<typeof StoreIssueOrderTokenSchema>
