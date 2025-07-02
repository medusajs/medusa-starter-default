import { MedusaService } from "@medusajs/framework/utils"
import InventoryLocation from "./models/inventory-location"
import InventoryLocationItem from "./models/inventory-location-item"

class InventoryLocationModuleService extends MedusaService({
  InventoryLocation,
  InventoryLocationItem,
}) {
  // Basis CRUD operaties worden automatisch gegenereerd door MedusaService
  // Aangepaste methoden kunnen hier worden toegevoegd
}

export default InventoryLocationModuleService 