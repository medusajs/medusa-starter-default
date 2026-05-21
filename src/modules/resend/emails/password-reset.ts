import fs from "node:fs"
import path from "node:path"
import Handlebars from "handlebars"

const templateSource = fs.readFileSync(
  path.join(__dirname, "password-reset.html"),
  "utf-8"
)
const compiledTemplate = Handlebars.compile(templateSource)

export const renderPasswordResetEmail = (
  data: Record<string, unknown>
): { subject: string; html: string } => {
  const email = String(data.email ?? "")
  const resetUrl = String(data.reset_url ?? "")
  const actorType = String(data.actor_type ?? "customer")
  const siteUrl =
    (data.site_url as string) ||
    process.env.STOREFRONT_URL ||
    "http://localhost:8000"

  const context = {
    site_url: siteUrl,
    email,
    reset_url: resetUrl,
    company: {
      address_line: process.env.COMPANY_ADDRESS_LINE ?? "",
      city: process.env.COMPANY_CITY ?? "",
    },
  }

  const subject =
    actorType === "user"
      ? "Admin-Passwort zurücksetzen"
      : "Passwort zurücksetzen für Kiji Games"

  return {
    subject,
    html: compiledTemplate(context),
  }
}
