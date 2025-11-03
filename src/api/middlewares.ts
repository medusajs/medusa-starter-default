import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { PostAdminCreateOfferSchema } from "./admin/offers/validators"
import {
  CreateRentalSchema,
  UpdateRentalSchema,
  UpdateStatusSchema,
  ReturnRentalSchema,
} from "./admin/rentals/validators"

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
    // TEM-204: Rentals API validation middleware
    {
      matcher: "/admin/rentals",
      method: "POST",
      middlewares: [
        validateAndTransformBody(CreateRentalSchema),
      ],
    },
    {
      matcher: "/admin/rentals/:id",
      method: "PUT",
      middlewares: [
        validateAndTransformBody(UpdateRentalSchema),
      ],
    },
    {
      matcher: "/admin/rentals/:id/status",
      method: "PUT",
      middlewares: [
        validateAndTransformBody(UpdateStatusSchema),
      ],
    },
    {
      matcher: "/admin/rentals/:id/return",
      method: "POST",
      middlewares: [
        validateAndTransformBody(ReturnRentalSchema),
      ],
    },
  ],
})
