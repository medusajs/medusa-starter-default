import { model } from "@medusajs/framework/utils"
import Company from "./company"

export const Employee = model
  .define("Employee", {
    id: model.id({ prefix: "emp" }).primaryKey(),
    company: model.belongsTo(() => Company, {
      mappedBy: "employees",
    }),
    customer_id: model.text(),
    is_admin: model.boolean().default(false),
    spending_limit: model.bigNumber().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_employee_company_id",
      on: ["company_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_employee_customer_id",
      on: ["customer_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default Employee
