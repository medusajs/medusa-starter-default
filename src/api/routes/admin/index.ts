import cors from "cors"
import { Router } from "express"
import bodyParser from "body-parser"
import customRouteHandler from "./custom-route-handler"
import { authenticate, wrapHandler } from "@medusajs/medusa";

const adminRouter = Router()
export function getAdminRouter(adminCorsOptions): Router {
  adminRouter.use(
    /\/admin\/((?!auth).*)/,
    cors(adminCorsOptions),
    bodyParser.json(), authenticate()
  )

  adminRouter.post(
    "/my-custom-path",
    wrapHandler(customRouteHandler)
  )

  return adminRouter
}
