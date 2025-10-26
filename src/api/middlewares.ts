import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { PostAdminCreateOfferSchema } from "./admin/offers/validators"

/**
 * Middleware definitions for custom API routes
 * Applies validation and transformation using Zod schemas
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/offers",
      method: "POST",
      middlewares: [
        validateAndTransformBody(PostAdminCreateOfferSchema),
      ],
    },
  ],
})
