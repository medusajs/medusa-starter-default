import * as cors from "cors"
import { Router } from "express"
import * as bodyParser from "body-parser"
import customRouteHandler from "./custom-route-handler"
import customRouteHandler2 from "./custom-route-handler-2"
import customRouteHandler3 from "./custom-route-handler-3"
import { wrapHandler } from "@medusajs/utils";
import { authenticateCustomer } from "@medusajs/medusa/dist/api/middlewares";

const storeRouter = Router()
export function getStoreRouter(storeCorsOptions): Router {
  storeRouter.use(cors(storeCorsOptions), bodyParser.json())

  storeRouter.options("/store/my-custom-path")
  storeRouter.post(
    "/store/my-custom-path",
    wrapHandler(customRouteHandler)
  )

  storeRouter.post(
    "/store/my-custom-path-2",
    wrapHandler(customRouteHandler2)
  )

  storeRouter.post(
    "/store/my-custom-protected-path",
    authenticateCustomer(),
    wrapHandler(customRouteHandler3)
  )

  return storeRouter
}