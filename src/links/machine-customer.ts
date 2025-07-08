import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import MachineModule from "../modules/machines"

export default defineLink(
  {
    linkable: MachineModule.linkable.machine,
    isList: true, // A customer can own multiple machines
  },
  {
    linkable: CustomerModule.linkable.customer,
    filterable: ["id", "email", "first_name", "last_name", "company_name"],
  }
) 