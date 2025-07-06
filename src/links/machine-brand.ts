import BrandModule from "../modules/brands"
import MachineModule from "../modules/machines"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  MachineModule.linkable.machine,
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name", "code"],
  }
) 