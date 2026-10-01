import { z } from "@medusajs/framework/zod"

export const UpsertPreorderVariantSchema = z.object({
  available_date: z.string().datetime(),
})

export type UpsertPreorderVariantSchema = z.infer<
  typeof UpsertPreorderVariantSchema
>
