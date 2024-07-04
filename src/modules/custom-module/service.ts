import { MedusaService } from "@medusajs/utils";
import Test from "./models/test";

class CustomModuleService extends MedusaService({
  Test,
}) {
}

export default CustomModuleService;
