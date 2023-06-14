import { Router } from "express"
import { getConfigFile } from "medusa-core-utils"
import {authenticate, ConfigModule} from "@medusajs/medusa"
import cors from "cors"
import bodyParser from "body-parser";
import {attachAdminRouter} from "./routes/admin";
import {attachStoreRouter} from "./routes/store";


export default (rootDirectory: string): Router | Router[] => {
  const { configModule: { projectConfig } } = getConfigFile<ConfigModule>(
    rootDirectory,
    "medusa-config"
  );

  const adminCors = {
    origin: projectConfig.admin_cors.split(","),
    credentials: true,
  }

  const storeCors = {
    origin: projectConfig.store_cors.split(","),
    credentials: true,
  }

  const router = Router()

  router.use("/store", cors(storeCors), bodyParser.json())
  router.use("/admin", cors(adminCors), bodyParser.json())
  router.use(/\/admin\/((?!auth)(?!invites).*)/, authenticate())

  const adminRouter = Router()
  const storeRouter = Router()

  router.use("/admin", adminRouter)
  router.use("/store", storeRouter)

  attachAdminRouter(adminRouter)
  attachStoreRouter(storeRouter)

  // add your custom routes here
  return router
}
