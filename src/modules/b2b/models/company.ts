import { model } from "@medusajs/framework/utils"
import { Employee } from "./employee"

export const Company = model
  .define("Company", {
    id: model.id({ prefix: "company" }).primaryKey(),
    name: model.text(),
    email: model.text().searchable(),
    phone: model.text().nullable(),
    address: model.text(),
    city: model.text(),
    state: model.text().nullable(),
    zip: model.text(),
    country: model.text(),
    currency_code: model.text(),
    approval_settings: model
      .json()
      .default({ requires_admin_approval: false }),
    metadata: model.json().nullable(),
    employees: model.hasMany(() => Employee, {
      mappedBy: "company",
    }),
  })
  .indexes([
    {
      name: "IDX_company_email",
      on: ["email"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_company_country",
      on: ["country"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default Company
