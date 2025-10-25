import { model } from "@medusajs/framework/utils"
import Offer from "./offer"

const OfferStatusHistory = model.define("offer_status_history", {
  id: model.id().primaryKey(),
  from_status: model.text().nullable(),
  to_status: model.text(),
  changed_by: model.text(),
  changed_at: model.dateTime(),
  reason: model.text().nullable(),

  offer: model.belongsTo(() => Offer, {
    mappedBy: "status_history",
  }),
})

export default OfferStatusHistory
