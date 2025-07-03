import { MedusaService } from "@medusajs/framework/utils"
import Machine from "./models/machine"

class MachinesService extends MedusaService({
  Machine,
}){
}

export default MachinesService 