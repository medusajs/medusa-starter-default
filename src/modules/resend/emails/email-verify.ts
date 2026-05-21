import fs from "node:fs"
import path from "node:path"
import Handlebars from "handlebars"

const templateSource = fs.readFileSync(
  path.join(__dirname, "email-verify.html"),
  "utf-8"
)
const compiledTemplate = Handlebars.compile(templateSource)

export const renderEmailVerifyEmail = (
  data: Record<string, unknown>
): { subject: string; html: string } => {
  const email = String(data.email ?? "")
  const verifyUrl = String(data.verify_url ?? "")
  const customer = (data.customer as { first_name?: string } | undefined) ?? {}
  const siteUrl =
    (data.site_url as string) ||
    process.env.STOREFRONT_URL ||
    "http://localhost:8000"

  const context = {
    site_url: siteUrl,
    email,
    verify_url: verifyUrl,
    customer: {
      first_name: customer.first_name ?? "",
    },
    company: {
      address_line: process.env.COMPANY_ADDRESS_LINE ?? "",
      city: process.env.COMPANY_CITY ?? "",
    },
  }

  return {
    subject: "Bestätige deine E-Mail-Adresse",
    html: compiledTemplate(context),
  }
}
