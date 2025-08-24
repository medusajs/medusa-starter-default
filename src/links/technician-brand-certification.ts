import BrandModule from "../modules/brands"
import TechnicianModule from "../modules/technicians"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  TechnicianModule.linkable.technician,
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name", "code"],
  },
  {
    database: {
      table: "technician_brand_certifications",
      extraColumns: {
        certification_level: {
          type: "text", // "basic", "advanced", "master"
          nullable: true
        },
        certification_date: {
          type: "date",
          nullable: true
        },
        expiry_date: {
          type: "date",
          nullable: true
        },
        certification_number: {
          type: "text",
          nullable: true
        },
        is_active: {
          type: "boolean",
          nullable: false
        }
      }
    }
  }
) 