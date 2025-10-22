import { model } from "@medusajs/framework/utils"

export const CartApproval = model
  .define("CartApproval", {
    id: model.id({ prefix: "cappr" }).primaryKey(),
    cart_id: model.text(),
    status: model.text().default("pending"),
    requested_by: model.text(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_cart_approval_cart_id",
      on: ["cart_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_cart_approval_status",
      on: ["status"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default CartApproval
