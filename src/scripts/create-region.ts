import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules
} from "@medusajs/framework/utils"

export default async function createRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionModuleService = container.resolve(Modules.REGION)

  logger.info("Creating Belgium region...")

  try {
    const region = await regionModuleService.createRegions({
      name: "Belgium",
      currency_code: "eur",
      countries: ["be"],
      automatic_taxes: true
    })
    
    logger.info(`Successfully created region: ${region.name} (ID: ${region.id})`)
  } catch (error) {
    logger.error("Failed to create region:", error)
  }
} 