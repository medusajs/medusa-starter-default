import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const redirectToAdminApp = (_req: MedusaRequest, res: MedusaResponse) => {
  res.redirect(308, "/app")
}

export const GET = redirectToAdminApp
export const HEAD = redirectToAdminApp
