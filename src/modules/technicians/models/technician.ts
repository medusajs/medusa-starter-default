import { model } from "@medusajs/framework/utils"

const Technician = model.define("technician", {
  id: model.id().primaryKey(),
  first_name: model.text(),
  last_name: model.text(),
  email: model.text().unique(),
  phone: model.text().nullable(),
  employee_id: model.text().unique().nullable(),
  department: model.text().nullable(),
  position: model.text().nullable(),
  hire_date: model.text().nullable(),
  certification_level: model.text().nullable(),
  certifications: model.text().nullable(),
  specializations: model.text().nullable(),
  hourly_rate: model.text().nullable(),
  salary: model.text().nullable(),
  address: model.text().nullable(),
  emergency_contact_name: model.text().nullable(),
  emergency_contact_phone: model.text().nullable(),
  status: model.text().default("active"),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Technician 