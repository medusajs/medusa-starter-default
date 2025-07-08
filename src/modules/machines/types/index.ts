export type MachineDTO = {
  id: string
  model: string
  serial_number: string
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
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateMachineDTO = {
  model: string
  serial_number: string
  year?: number
  engine_hours?: number
  fuel_type?: string
  horsepower?: number
  weight?: number
  purchase_date?: Date
  purchase_price?: string
  current_value?: string
  status?: "active" | "inactive" | "maintenance" | "sold"
  location?: string
  customer_id?: string
  notes?: string
  metadata?: Record<string, any>
}

export type FilterableMachineProps = {
  id?: string | string[]
  model?: string | string[]
  serial_number?: string | string[]
  status?: string | string[]
  customer_id?: string | string[]
  location?: string
  year?: number | { gte?: number; lte?: number }
  engine_hours?: number | { gte?: number; lte?: number }
} 