import { Router } from "express"
import { getConfigFile } from "medusa-core-utils"
import { getStoreRouter } from "./routes/store"
import { ConfigModule } from "@medusajs/medusa/dist/types/global";

export default (rootDirectory: string): Router | Router[] => {
  const { configModule: {projectConfig} } = getConfigFile(
    rootDirectory,
    "medusa-config"
  ) as { configModule: ConfigModule }

  const storeCorsOptions = {
    origin: projectConfig.store_cors.split(","),
    credentials: true,
  }

  const storeRouter = getStoreRouter(storeCorsOptions)

  return [storeRouter]
}