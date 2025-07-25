export type MachineDTO = {
  id: string
  brand_id?: string | null
  model_number: string
  serial_number: string
  license_plate?: string | null
  year?: number | null
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: Date | null
  purchase_price?: string | null
  current_value?: string | null
  status: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
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
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: Date | null
  purchase_price?: string | null
  current_value?: string | null
  status?: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
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
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: Date | null
  purchase_price?: string | null
  current_value?: string | null
  status?: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
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
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: Date | null
  purchase_price?: string | null
  current_value?: string | null
  status?: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
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
  status?: "active" | "inactive" | "maintenance" | "sold" | string[]
  location?: string | string[]
  customer_id?: string | string[]
  fuel_type?: string | string[]
  created_at?: Date
  updated_at?: Date
  deleted_at?: Date
} 