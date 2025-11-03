import { defineLink } from "@medusajs/framework/utils"
import RentalModule from "../modules/rentals"
import CustomerModule from "@medusajs/medusa/customer"

/**
 * TEM-203: Module link between Rental and Customer
 *
 * Links rentals to customers using read-only link pattern.
 * The rental model stores customer_id field, and this link
 * enables querying rentals with customer data via Query API.
 *
 * Direction: Rental -> Customer (for association)
 * Pattern: Read-only (no link table, uses existing customer_id field)
 */
export default defineLink(
  {
    linkable: RentalModule.linkable.rental,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
)
