/**
 * Supplier Import Template Model
 *
 * Stores reusable parsing configurations for supplier price list imports
 *
 * @see TEM-301 - Create Import Template Storage API
 */

import { model } from "@medusajs/framework/utils"

const SupplierImportTemplate = model.define("supplier_import_template", {
  id: model.id().primaryKey(),
  supplier_id: model.text(),
  name: model.text(),
  description: model.text().nullable(),
  file_type: model.enum(["csv", "txt"]),
  parse_config: model.json(),
  column_mapping: model.json(),
})
  .indexes([
    {
      on: ["supplier_id", "file_type"],
      name: "idx_supplier_import_template_supplier_file_type",
    },
    {
      on: ["supplier_id", "name"],
      unique: true,
      name: "uniq_supplier_import_template_supplier_name",
    },
  ])

export default SupplierImportTemplate
