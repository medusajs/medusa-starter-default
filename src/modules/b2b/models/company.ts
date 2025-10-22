import { model } from "@medusajs/framework/utils"
import { Employee } from "./employee"

export const Company = model
  .define("Company", {
    id: model.id({ prefix: "company" }).primaryKey(),
    name: model.text(),
    email: model.text().searchable(),
    phone: model.text().nullable(),
    address: model.text().nullable(),
    city: model.text().nullable(),
    state: model.text().nullable(),
    zip: model.text().nullable(),
    country: model.text().nullable(),
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
