export type SupplierDTO = {
  id: string
  name: string
  code?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  contact_person?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  tax_id?: string | null
  payment_terms?: string | null
  currency_code: string
  is_active: boolean
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type SupplierProductDTO = {
  id: string
  supplier_id: string
  product_variant_id: string
  supplier_sku?: string | null
  supplier_product_name?: string | null
  supplier_product_description?: string | null
  cost_price: number
  currency_code: string
  minimum_order_quantity: number
  lead_time_days?: number | null
  is_preferred_supplier: boolean
  is_active: boolean
  last_cost_update?: Date | null
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type PurchaseOrderDTO = {
  id: string
  po_number: string
  supplier_id: string
  status: "draft" | "sent" | "confirmed" | "partially_received" | "received" | "cancelled"
  type: "stock" | "rush"
  order_date: Date
  expected_delivery_date?: Date | null
  actual_delivery_date?: Date | null
  currency_code: string
  subtotal: number
  tax_amount: number
  shipping_amount: number
  discount_amount: number
  total_amount: number
  payment_terms?: string | null
  delivery_address?: Record<string, any> | null
  notes?: string | null
  created_by?: string | null
  confirmed_by?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
  // Relations
  items?: PurchaseOrderItemDTO[]
  supplier?: SupplierDTO
}

export type PurchaseOrderItemDTO = {
  id: string
  purchase_order_id: string
  product_variant_id: string
  supplier_product_id?: string | null
  supplier_sku?: string | null
  product_title: string
  product_variant_title?: string | null
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  line_total: number
  received_date?: Date | null
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
  // Relations
  purchase_order?: PurchaseOrderDTO
}

// Export parser types
export * from "./parser-types" 