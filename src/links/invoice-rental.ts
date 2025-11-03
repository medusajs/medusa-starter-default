import { defineLink } from "@medusajs/framework/utils"
import InvoicingModule from "../modules/invoicing"
import RentalsModule from "../modules/rentals"

/**
 * TEM-206: Invoice-Rental Module Link
 *
 * Establishes a relationship between invoices and rentals,
 * enabling invoice generation from rental orders.
 */

export default defineLink(
  InvoicingModule.linkable.invoice,
  RentalsModule.linkable.rental
)
