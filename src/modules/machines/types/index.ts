export type MachineDTO = {
  id: string
  brand_id?: string | null
  model_number: string
  serial_number: string
  license_plate?: string | null
  year?: number | null
  machine_type?: string | null
  engine_hours?: number | null
  status: "active" | "inactive" | "maintenance" | "sold"
  customer_id?: string | null
  description?: string | null
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateMachineDTO = {
  brand_id?: string | null
  model_number: string
  serial_number: string
  license_plate?: string | null
  year?: number | null
  machine_type?: string | null
  engine_hours?: number | null
  status?: "active" | "inactive" | "maintenance" | "sold"
  customer_id?: string | null
  description?: string | null
  notes?: string | null
  metadata?: Record<string, any> | null
}

export type UpdateMachineDTO = {
  id: string
  brand_id?: string | null
  model_number?: string
  serial_number?: string
  license_plate?: string | null
  year?: number | null
  machine_type?: string | null
  engine_hours?: number | null
  status?: "active" | "inactive" | "maintenance" | "sold"
  customer_id?: string | null
  description?: string | null
  notes?: string | null
  metadata?: Record<string, any> | null
}

export type UpsertMachineDTO = {
  id?: string
  brand_id?: string | null
  model_number?: string
  serial_number?: string
  license_plate?: string | null
  year?: number | null
  machine_type?: string | null
  engine_hours?: number | null
  status?: "active" | "inactive" | "maintenance" | "sold"
  customer_id?: string | null
  description?: string | null
  notes?: string | null
  metadata?: Record<string, any> | null
}

export type FilterableMachineProps = {
  id?: string | string[]
  brand_id?: string | string[]
  model_number?: string | string[]
  serial_number?: string | string[]
  license_plate?: string | string[]
  year?: number | number[]
  machine_type?: string | string[]
  engine_hours?: number | number[]
  status?: "active" | "inactive" | "maintenance" | "sold" | ("active" | "inactive" | "maintenance" | "sold")[]
  customer_id?: string | string[]
  description?: string | string[]
  notes?: string | string[]
  created_at?: Date | { $gte?: Date; $lte?: Date }
  updated_at?: Date | { $gte?: Date; $lte?: Date }
  deleted_at?: Date | { $gte?: Date; $lte?: Date } | null
} 