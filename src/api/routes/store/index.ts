import { Router } from "express";
import customRouteHandler from "./custom-route-handler";
import { wrapHandler } from "@medusajs/medusa";

// Initialize a custom router
const router = Router();

export function attachStoreRoutes(storeRouter: Router) {
  // Attach our router to a custom path on the store router
  storeRouter.use("/custom", router);

  // Define a GET endpoint on the root route of our custom path
  router.get("/", wrapHandler(customRouteHandler));
}
