import { model } from "@medusajs/framework/utils"
import { PreorderVariant } from "./preorder-variant"

export enum PreorderStatus {
  PENDING = "pending",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
}

export const Preorder = model.define(
  "preorder",
  {
    id: model.id().primaryKey(),
    order_id: model.text().index(),
    item: model.belongsTo(() => PreorderVariant, {
      mappedBy: "preorders",
    }),
    status: model.enum(Object.values(PreorderStatus))
      .default(PreorderStatus.PENDING),
  }
).indexes([
  {
    on: ["item_id", "status"],
  },
  // One preorder per (order, preorder variant); guards against duplicate creation
  {
    on: ["order_id", "item_id"],
    unique: true,
  },
])
