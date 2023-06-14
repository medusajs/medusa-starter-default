import { Router } from "express"
import customRouteHandler from "./custom-route-handler"
import { wrapHandler } from "@medusajs/medusa";

const adminRouter = Router()
export function attachAdminRouter(app: Router) {
  app.use("/custom", adminRouter)

  adminRouter.get(
    "/",
    wrapHandler(customRouteHandler)
  )
}
