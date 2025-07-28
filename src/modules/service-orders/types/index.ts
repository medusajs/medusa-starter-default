export type ServiceOrderDTO = {
  id: string
  service_order_number: string
  customer_id?: string | null
  machine_id?: string | null
  technician_id?: string | null
  service_type: "normal" | "warranty" | "setup" | "emergency" | "preventive"
  status: "draft" | "ready_for_pickup" | "in_progress" | "done" | "returned_for_review"
  priority: "low" | "normal" | "high" | "urgent"
  service_location: "workshop" | "customer_location"
  description: string
  customer_complaint?: string | null
  diagnosis?: string | null
  work_performed?: string | null
  scheduled_start_date?: Date | null
  scheduled_end_date?: Date | null
  actual_start_date?: Date | null
  actual_end_date?: Date | null
  estimated_hours?: number | null
  actual_hours: number
  labor_rate?: number | null
  total_labor_cost: number
  total_parts_cost: number
  total_cost: number
  warranty_claim_number?: string | null
  warranty_approved: boolean
  requires_parts_approval: boolean
  customer_approval_required: boolean
  service_address_line_1?: string | null
  service_address_line_2?: string | null
  service_city?: string | null
  service_postal_code?: string | null
  service_country?: string | null
  internal_notes?: string | null
  customer_notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateServiceOrderDTO = {
  service_order_number?: string
  customer_id?: string | null
  machine_id?: string | null
  technician_id?: string | null
  service_type?: "normal" | "warranty" | "setup" | "emergency" | "preventive"
  status?: "draft" | "ready_for_pickup" | "in_progress" | "done" | "returned_for_review"
  priority?: "low" | "normal" | "high" | "urgent"
  service_location?: "workshop" | "customer_location"
  description: string
  customer_complaint?: string | null
  diagnosis?: string | null
  work_performed?: string | null
  scheduled_start_date?: Date | null
  scheduled_end_date?: Date | null
  actual_start_date?: Date | null
  actual_end_date?: Date | null
  estimated_hours?: number | null
  actual_hours?: number
  labor_rate?: number | null
  total_labor_cost?: number
  total_parts_cost?: number
  total_cost?: number
  warranty_claim_number?: string | null
  warranty_approved?: boolean
  requires_parts_approval?: boolean
  customer_approval_required?: boolean
  service_address_line_1?: string | null
  service_address_line_2?: string | null
  service_city?: string | null
  service_postal_code?: string | null
  service_country?: string | null
  internal_notes?: string | null
  customer_notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  metadata?: Record<string, any> | null
}

export type UpdateServiceOrderDTO = {
  id: string
  service_order_number?: string
  customer_id?: string | null
  machine_id?: string | null
  technician_id?: string | null
  service_type?: "normal" | "warranty" | "setup" | "emergency" | "preventive"
  status?: "draft" | "ready_for_pickup" | "in_progress" | "done" | "returned_for_review"
  priority?: "low" | "normal" | "high" | "urgent"
  service_location?: "workshop" | "customer_location"
  description?: string
  customer_complaint?: string | null
  diagnosis?: string | null
  work_performed?: string | null
  scheduled_start_date?: Date | null
  scheduled_end_date?: Date | null
  actual_start_date?: Date | null
  actual_end_date?: Date | null
  estimated_hours?: number | null
  actual_hours?: number
  labor_rate?: number | null
  total_labor_cost?: number
  total_parts_cost?: number
  total_cost?: number
  warranty_claim_number?: string | null
  warranty_approved?: boolean
  requires_parts_approval?: boolean
  customer_approval_required?: boolean
  service_address_line_1?: string | null
  service_address_line_2?: string | null
  service_city?: string | null
  service_postal_code?: string | null
  service_country?: string | null
  internal_notes?: string | null
  customer_notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  metadata?: Record<string, any> | null
}

export type ServiceOrderCommentDTO = {
  id: string
  service_order_id: string
  message: string
  author_id: string
  author_type: "user" | "technician" | "customer" | "system"
  author_name: string
  parent_comment_id?: string | null
  is_internal: boolean
  is_pinned: boolean
  attachments?: Record<string, any> | null
  mentions?: Record<string, any> | null
  is_edited: boolean
  edited_at?: Date | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateServiceOrderCommentDTO = {
  service_order_id: string
  message: string
  author_id: string
  author_type: "user" | "technician" | "customer" | "system"
  author_name: string
  parent_comment_id?: string | null
  is_internal?: boolean
  is_pinned?: boolean
  attachments?: Record<string, any> | null
  mentions?: Record<string, any> | null
  metadata?: Record<string, any> | null
}

export type UpdateServiceOrderCommentDTO = {
  id: string
  message?: string
  is_pinned?: boolean
  metadata?: Record<string, any> | null
}

export type FilterableServiceOrderProps = {
  id?: string | string[]
  service_order_number?: string | string[]
  customer_id?: string | string[]
  machine_id?: string | string[]
  technician_id?: string | string[]
  service_type?: "normal" | "warranty" | "setup" | "emergency" | "preventive" | string[]
  status?: "draft" | "ready_for_pickup" | "in_progress" | "done" | "returned_for_review" | string[]
  priority?: "low" | "normal" | "high" | "urgent" | string[]
  service_location?: "workshop" | "customer_location" | string[]
  created_at?: Date
  updated_at?: Date
  deleted_at?: Date
}