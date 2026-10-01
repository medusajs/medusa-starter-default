import { companyBlock, renderTemplate, siteUrl, type RenderedEmail } from "./_shared"
import template from "./templates/password-reset"

export const renderPasswordResetEmail = (data: Record<string, unknown>): RenderedEmail => {
  const actorType = String(data.actor_type ?? "customer")

  return {
    subject:
      actorType === "user"
        ? "Admin-Passwort zurücksetzen"
        : "Passwort zurücksetzen für Kiji Games",
    html: renderTemplate("password-reset", template, {
      site_url: siteUrl(data),
      email: String(data.email ?? ""),
      reset_url: String(data.reset_url ?? ""),
      company: companyBlock(),
    }),
  }
}
