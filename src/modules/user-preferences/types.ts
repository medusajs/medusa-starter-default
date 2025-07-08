export interface UserPreferencesDTO {
  id: string
  user_id: string
  language: string
  timezone?: string
  currency?: string
  date_format?: string
  created_at: Date
  updated_at: Date
}

export interface CreateUserPreferencesDTO {
  user_id: string
  language: string
  timezone?: string
  currency?: string
  date_format?: string
}

export interface UpdateUserPreferencesDTO {
  language?: string
  timezone?: string
  currency?: string
  date_format?: string
}

export interface FilterableUserPreferencesProps {
  id?: string
  user_id?: string
  language?: string
} 