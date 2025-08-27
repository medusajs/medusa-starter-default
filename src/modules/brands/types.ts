export type BrandDTO = {
  id: string
  name: string
  code: string
  logo_url?: string | null
  website_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  description?: string | null
  country_of_origin?: string | null
  warranty_terms?: string | null
  authorized_dealer: boolean
  is_oem: boolean
  is_active: boolean
  display_order: number
  metadata?: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export type CreateBrandDTO = {
  name: string
  code?: string
  logo_url?: string | null
  website_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  description?: string | null
  country_of_origin?: string | null
  warranty_terms?: string | null
  authorized_dealer?: boolean
  is_oem?: boolean
  is_active?: boolean
  display_order?: number
  metadata?: Record<string, any> | null
}

export type UpdateBrandDTO = {
  id: string
  name?: string
  code?: string
  logo_url?: string | null
  website_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  description?: string | null
  country_of_origin?: string | null
  warranty_terms?: string | null
  authorized_dealer?: boolean
  is_oem?: boolean
  is_active?: boolean
  display_order?: number
  metadata?: Record<string, any> | null
}

export type FilterableBrandProps = {
  id?: string | string[]
  name?: string | string[]
  code?: string | string[]
  authorized_dealer?: boolean
  is_oem?: boolean
  is_active?: boolean
  created_at?: Date | { $gte?: Date; $lte?: Date }
  updated_at?: Date | { $gte?: Date; $lte?: Date }
  deleted_at?: Date | { $gte?: Date; $lte?: Date } | null
}