export type WarrantyDTO = {
  id: string
  warranty_number: string
  service_order_id: string
  customer_id?: string | null
  machine_id?: string | null
  warranty_type: "manufacturer" | "supplier" | "extended" | "goodwill"
  status: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed"
  warranty_claim_number?: string | null
  warranty_provider?: string | null
  claim_reference?: string | null
  labor_cost: number
  parts_cost: number
  total_cost: number
  reimbursement_amount: number
  currency_code: string
  warranty_start_date?: Date | null
  warranty_end_date?: Date | null
  claim_date?: Date | null
  approval_date?: Date | null
  reimbursement_date?: Date | null
  billing_address_line_1?: string | null
  billing_address_line_2?: string | null
  billing_city?: string | null
  billing_postal_code?: string | null
  billing_country?: string | null
  service_address_line_1?: string | null
  service_address_line_2?: string | null
  service_city?: string | null
  service_postal_code?: string | null
  service_country?: string | null
  description?: string | null
  failure_description?: string | null
  repair_description?: string | null
  notes?: string | null
  internal_notes?: string | null
  metadata?: Record<string, any> | null
  created_by?: string | null
  updated_by?: string | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
  line_items?: WarrantyLineItemDTO[]
  status_history?: WarrantyStatusHistoryDTO[]
}

export type CreateWarrantyDTO = {
  service_order_id: string
  customer_id?: string | null
  machine_id?: string | null
  warranty_type?: "manufacturer" | "supplier" | "extended" | "goodwill"
  status?: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed"
  warranty_claim_number?: string | null
  warranty_provider?: string | null
  claim_reference?: string | null
  labor_cost?: number
  parts_cost?: number
  total_cost?: number
  reimbursement_amount?: number
  currency_code?: string
  warranty_start_date?: Date | null
  warranty_end_date?: Date | null
  claim_date?: Date | null
  approval_date?: Date | null
  reimbursement_date?: Date | null
  billing_address_line_1?: string | null
  billing_address_line_2?: string | null
  billing_city?: string | null
  billing_postal_code?: string | null
  billing_country?: string | null
  service_address_line_1?: string | null
  service_address_line_2?: string | null
  service_city?: string | null
  service_postal_code?: string | null
  service_country?: string | null
  description?: string | null
  failure_description?: string | null
  repair_description?: string | null
  notes?: string | null
  internal_notes?: string | null
  metadata?: Record<string, any> | null
  created_by?: string | null
  updated_by?: string | null
}

export type UpdateWarrantyDTO = Partial<CreateWarrantyDTO> & {
  id?: never // Prevent id updates
}

export type WarrantyLineItemDTO = {
  id: string
  warranty_id: string
  item_type: "labor" | "product" | "shipping" | "adjustment"
  title: string
  description?: string | null
  sku?: string | null
  quantity: number
  unit_price: number
  total_amount: number
  product_id?: string | null
  variant_id?: string | null
  service_order_id?: string | null
  service_order_item_id?: string | null
  service_order_time_entry_id?: string | null
  hours_worked?: number | null
  hourly_rate?: number | null
  tax_rate: number
  tax_amount: number
  is_reimbursable: boolean
  reimbursement_amount: number
  reimbursement_reference?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateWarrantyLineItemDTO = {
  warranty_id: string
  item_type?: "labor" | "product" | "shipping" | "adjustment"
  title: string
  description?: string | null
  sku?: string | null
  quantity?: number
  unit_price?: number
  total_amount?: number
  product_id?: string | null
  variant_id?: string | null
  service_order_id?: string | null
  service_order_item_id?: string | null
  service_order_time_entry_id?: string | null
  hours_worked?: number | null
  hourly_rate?: number | null
  tax_rate?: number
  tax_amount?: number
  is_reimbursable?: boolean
  reimbursement_amount?: number
  reimbursement_reference?: string | null
  metadata?: Record<string, any> | null
}

export type UpdateWarrantyLineItemDTO = Partial<CreateWarrantyLineItemDTO> & {
  id?: never
  warranty_id?: never // Prevent changing warranty association
}

export type WarrantyStatusHistoryDTO = {
  id: string
  warranty_id: string
  from_status?: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed" | null
  to_status: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed"
  changed_by?: string | null
  change_reason?: string | null
  notes?: string | null
  external_reference?: string | null
  approval_number?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateWarrantyStatusHistoryDTO = {
  warranty_id: string
  from_status?: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed" | null
  to_status: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed"
  changed_by?: string | null
  change_reason?: string | null
  notes?: string | null
  external_reference?: string | null
  approval_number?: string | null
  metadata?: Record<string, any> | null
}

// Workflow-specific types
export type ConvertServiceOrderToWarrantyInput = {
  service_order_id: string
  warranty_type?: "manufacturer" | "supplier" | "extended" | "goodwill"
  warranty_provider?: string | null
  warranty_claim_number?: string | null
  notes?: string | null
  created_by?: string | null
}

// Filter and query types
export type WarrantyFilters = {
  id?: string | string[]
  warranty_number?: string | string[]
  service_order_id?: string | string[]
  customer_id?: string | string[]
  machine_id?: string | string[]
  warranty_type?: "manufacturer" | "supplier" | "extended" | "goodwill" | ("manufacturer" | "supplier" | "extended" | "goodwill")[]
  status?: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed" | ("draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed")[]
  warranty_provider?: string | string[]
  claim_date?: { gte?: Date; lte?: Date }
  approval_date?: { gte?: Date; lte?: Date }
  reimbursement_date?: { gte?: Date; lte?: Date }
  created_at?: { gte?: Date; lte?: Date }
  updated_at?: { gte?: Date; lte?: Date }
} 