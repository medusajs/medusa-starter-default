import { MedusaService } from "@medusajs/framework/utils"
import Technician from "./models/technician"

class TechniciansService extends MedusaService({
  Technician,
}){
}

export default TechniciansService 