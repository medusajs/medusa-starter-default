import { RentalOrderStatus, RentalOrderType } from "../models/rental-order"

export type CreateRentalOrderDTO = {
  customer_id: string
  machine_id: string
  rental_type?: keyof typeof RentalOrderType
  start_date: Date
  end_date: Date
  daily_rate: number
  weekly_rate?: number
  monthly_rate?: number
  security_deposit?: number
  delivery_required?: boolean
  delivery_address_line_1?: string
  delivery_address_line_2?: string
  delivery_city?: string
  delivery_postal_code?: string
  delivery_country?: string
  delivery_cost?: number
  pickup_required?: boolean
  pickup_address_line_1?: string
  pickup_address_line_2?: string
  pickup_city?: string
  pickup_postal_code?: string
  pickup_country?: string
  pickup_cost?: number
  terms_and_conditions?: string
  special_instructions?: string
  insurance_required?: boolean
  insurance_cost?: number
  billing_cycle?: "daily" | "weekly" | "monthly"
  payment_terms?: string
  late_fee_percentage?: number
  notes?: string
  internal_notes?: string
  created_by?: string
  metadata?: Record<string, any>
}

export type UpdateRentalOrderDTO = Partial<CreateRentalOrderDTO> & {
  id: string
  updated_by?: string
}

export type CreateRentalItemDTO = {
  rental_order_id: string
  machine_id?: string
  product_variant_id?: string
  item_type?: "machine" | "accessory" | "tool" | "other"
  item_name: string
  item_description?: string
  quantity?: number
  daily_rate: number
  weekly_rate?: number
  monthly_rate?: number
  serial_numbers?: string
  notes?: string
  metadata?: Record<string, any>
}

export type UpdateRentalItemDTO = Partial<CreateRentalItemDTO> & {
  id: string
}

export type RentalOrderFilters = {
  customer_id?: string
  machine_id?: string
  status?: keyof typeof RentalOrderStatus | (keyof typeof RentalOrderStatus)[]
  rental_type?: keyof typeof RentalOrderType | (keyof typeof RentalOrderType)[]
  start_date?: {
    gte?: Date
    lte?: Date
  }
  end_date?: {
    gte?: Date
    lte?: Date
  }
  created_at?: {
    gte?: Date
    lte?: Date
  }
}

export type RentalOrderSortOptions = {
  field: "created_at" | "start_date" | "end_date" | "rental_order_number" | "total_rental_cost"
  order: "asc" | "desc"
}

// Re-export model enums
export { RentalOrderStatus, RentalOrderType } from "../models/rental-order"