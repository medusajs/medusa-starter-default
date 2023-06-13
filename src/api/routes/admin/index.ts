import cors from "cors"
import { Router } from "express"
import bodyParser from "body-parser"
import customRouteHandler from "./custom-route-handler"
import { authenticate, wrapHandler } from "@medusajs/medusa";

const adminRouter = Router()
export function getStoreRouter(adminCorsOptions): Router {
  adminRouter.use("/admin", cors(adminCorsOptions), authenticate(), bodyParser.json())

  adminRouter.post(
    "/my-custom-path",
    wrapHandler(customRouteHandler)
  )

  return adminRouter
}
