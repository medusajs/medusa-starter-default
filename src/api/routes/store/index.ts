import * as cors from "cors"
import { Router } from "express"
import * as bodyParser from "body-parser"
import customRouteHandler from "./custom-route-handler"
import { wrapHandler } from "@medusajs/medusa";

const storeRouter = Router()
export function getStoreRouter(storeCorsOptions): Router {
  storeRouter.use(cors(storeCorsOptions), bodyParser.json())

  storeRouter.post(
    "/store/my-custom-path",
    wrapHandler(customRouteHandler)
  )

  return storeRouter
}
