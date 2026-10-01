import type { HttpTypes } from "@medusajs/framework/types"

export type PreorderVariantStatus = "enabled" | "disabled"

export type PreorderStatus = "pending" | "fulfilled" | "cancelled"

export interface PreorderVariant {
  id: string
  variant_id: string
  available_date: string
  status: PreorderVariantStatus
}

export interface Preorder {
  id: string
  order_id: string
  item_id: string
  status: PreorderStatus
  item: PreorderVariant & {
    product_variant: {
      id: string
      title: string | null
      product_id: string | null
      product: {
        id: string
        thumbnail: string | null
      } | null
    } | null
  }
}

export interface AdminOrderPreordersResponse {
  preorders: Preorder[]
}

// retrieveVariant is called with `+preorder_variant.*`, which the SDK's
// response type doesn't know about — the link field is added here.
export type AdminVariantWithPreorder = HttpTypes.AdminProductVariant & {
  preorder_variant?: PreorderVariant | null
}

export interface AdminUpsertPreorderVariantBody {
  available_date: string
}

export interface AdminPreorderVariantResponse {
  preorder_variant: PreorderVariant
}

export interface AdminSetEmailVerifiedResponse {
  customer_id: string
  verified: boolean
}
