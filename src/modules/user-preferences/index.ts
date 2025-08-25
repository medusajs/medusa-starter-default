import UserPreferencesService from "./service"
import { Module } from "@medusajs/framework/utils"

export const USER_PREFERENCES_MODULE = "userPreferences"

export default Module(USER_PREFERENCES_MODULE, {
  service: UserPreferencesService,
  definition: {
    isQueryable: true
  }
})

export { UserPreferencesService }
export * from "./types" 