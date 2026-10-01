import { companyBlock, renderTemplate, siteUrl, type RenderedEmail } from "./_shared"
import template from "./templates/welcome"

export const renderWelcomeEmail = (data: Record<string, unknown>): RenderedEmail => {
  const customer = (data.customer as { first_name?: string | null } | undefined) ?? {}
  const site = siteUrl(data)

  return {
    subject: "Willkommen bei Kiji Games",
    html: renderTemplate("welcome", template, {
      site_url: site,
      account_url: (typeof data.account_url === "string" && data.account_url) || `${site}/account`,
      customer: { first_name: customer.first_name ?? "" },
      company: companyBlock(),
    }),
  }
}
