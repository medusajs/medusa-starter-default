import { companyBlock, renderTemplate, siteUrl, type RenderedEmail } from "./_shared"
import template from "./templates/email-verify"

export const renderEmailVerifyEmail = (data: Record<string, unknown>): RenderedEmail => {
  const customer = (data.customer as { first_name?: string | null } | undefined) ?? {}

  return {
    subject: "Bestätige deine E-Mail-Adresse",
    html: renderTemplate("email-verify", template, {
      site_url: siteUrl(data),
      email: String(data.email ?? ""),
      verify_url: String(data.verify_url ?? ""),
      customer: { first_name: customer.first_name ?? "" },
      company: companyBlock(),
    }),
  }
}
