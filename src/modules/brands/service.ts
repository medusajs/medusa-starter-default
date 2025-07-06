import { MedusaService } from "@medusajs/framework/utils"
import Brand from "./models/brand"

class BrandsService extends MedusaService({
  Brand,
}) {}

export default BrandsService 