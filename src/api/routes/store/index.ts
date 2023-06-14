import { Router } from "express"
import customRouteHandler from "./custom-route-handler"
import { wrapHandler } from "@medusajs/medusa";

const storeRouter = Router()
export function attachStoreRouter(app: Router) {
  app.use("/custom", storeRouter)

  storeRouter.get(
    "/",
    wrapHandler(customRouteHandler)
  )
}
