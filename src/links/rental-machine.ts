import { defineLink } from "@medusajs/framework/utils"
import RentalModule from "../modules/rentals"
import MachineModule from "../modules/machines"

/**
 * TEM-203: Module link between Rental and Machine
 *
 * Links rentals to machines using read-only link pattern.
 * The rental model stores machine_id field, and this link
 * enables querying rentals with machine data via Query API.
 *
 * Direction: Rental -> Machine (for association)
 * Pattern: Read-only (no link table, uses existing machine_id field)
 */
export default defineLink(
  {
    linkable: RentalModule.linkable.rental,
    field: "machine_id",
  },
  MachineModule.linkable.machine,
  {
    readOnly: true,
  }
)
