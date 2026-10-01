import Handlebars from "handlebars"

import { buildOrderUrl, getStorefrontUrl } from "../../../utils/urls"

export type RenderedEmail = { subject: string; html: string }
export type EmailRenderer = (data: Record<string, unknown>) => RenderedEmail

// Isolated Handlebars env so helpers/partials registered elsewhere can't leak
// into the mail templates. Double-stash `{{x}}` HTML-escapes every value;
// templates must not use triple-stash `{{{x}}}` for anything user-provided.
const handlebars = Handlebars.create()
const compiled = new Map<string, Handlebars.TemplateDelegate>()

// Compiles a template on first use and caches it per name.
export function renderTemplate(
  name: string,
  source: string,
  context: Record<string, unknown>,
): string {
  let template = compiled.get(name)
  if (!template) {
    template = handlebars.compile(source)
    compiled.set(name, template)
  }
  return template(context)
}

// Storefront base URL for links in the mail; callers may override via data.site_url.
export function siteUrl(data: Record<string, unknown>): string {
  return (typeof data.site_url === "string" && data.site_url) || getStorefrontUrl()
}

// Prefer a URL handed in by the caller, else build the tokenised order link
// (the token only grants access to guest orders; account orders need login).
export function orderUrl(data: Record<string, unknown>, orderId: string): string {
  return (typeof data.order_url === "string" && data.order_url) || buildOrderUrl(orderId)
}

export function placeholderImage(site: string): string {
  return `${site}/placeholder.png`
}

export function companyBlock(): { address_line: string; city: string } {
  return {
    address_line: process.env.COMPANY_ADDRESS_LINE || "",
    city: process.env.COMPANY_CITY || "",
  }
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date)
}

const countryDisplay = new Intl.DisplayNames(["de"], { type: "region" })

export function countryName(countryCode?: string | null): string {
  if (!countryCode) return ""
  const code = countryCode.toUpperCase()
  try {
    return countryDisplay.of(code) ?? code
  } catch {
    return code
  }
}

export type AddressInput = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
} | null | undefined

export function addressBlock(address: AddressInput) {
  const a = address ?? {}
  return {
    first_name: a.first_name ?? "",
    last_name: a.last_name ?? "",
    company: a.company ?? "",
    address_1: a.address_1 ?? "",
    address_2: a.address_2 ?? "",
    postal_code: a.postal_code ?? "",
    city: a.city ?? "",
    country_name: countryName(a.country_code),
  }
}

// Minimal line-item shape shared by the order-related templates.
export type MailLineItem = {
  id?: string
  title?: string | null
  product_title?: string | null
  variant_title?: string | null
  thumbnail?: string | null
  quantity?: number | null
}

export function itemTitle(item: MailLineItem | undefined, fallback?: string | null): string {
  return item?.product_title || item?.title || fallback || "Artikel"
}
