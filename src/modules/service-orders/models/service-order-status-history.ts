import { model } from "@medusajs/framework/utils"

const ServiceOrderStatusHistory = model.define("service_order_status_history", {
  id: model.id().primaryKey(),
  service_order_id: model.text(),
  
  from_status: model.text().nullable(),
  to_status: model.text(),
  
  changed_by: model.text(),
  changed_at: model.dateTime(),
  reason: model.text().nullable(),
  notes: model.text().nullable(),
  
  metadata: model.json().nullable(),
})

export default ServiceOrderStatusHistory 