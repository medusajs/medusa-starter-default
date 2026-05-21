import fs from "node:fs"
import path from "node:path"
import Handlebars from "handlebars"

const templateSource = fs.readFileSync(
  path.join(__dirname, "shipment-created.html"),
  "utf-8"
)
const compiledTemplate = Handlebars.compile(templateSource)

const countryDisplay = new Intl.DisplayNames(["de"], { type: "region" })

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const resolveCountryName = (countryCode?: string | null): string => {
  if (!countryCode) return ""
  try {
    return countryDisplay.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase()
  } catch {
    return countryCode.toUpperCase()
  }
}

const buildDhlTrackingUrl = (trackingNumber: string): string =>
  `https://nolp.dhl.de/nextt-online-public/set_identcodes.do?lang=de&idc=${encodeURIComponent(
    trackingNumber
  )}`

const inferCarrier = (
  providerId: string | undefined,
  trackingUrl: string | undefined
): string => {
  const haystack = `${providerId ?? ""} ${trackingUrl ?? ""}`.toLowerCase()
  if (haystack.includes("dhl")) return "DHL"
  if (haystack.includes("dpd")) return "DPD"
  if (haystack.includes("hermes")) return "Hermes"
  if (haystack.includes("ups")) return "UPS"
  if (haystack.includes("fedex")) return "FedEx"
  if (haystack.includes("gls")) return "GLS"
  return "den Versanddienstleister"
}

type TrackingLink = {
  tracking_number: string
  tracking_url: string
}

export const renderShipmentCreatedEmail = (
  data: Record<string, unknown>
): { subject: string; html: string } => {
  const fulfillment = data.fulfillment as any
  const order = data.order as any
  const siteUrl =
    (data.site_url as string) ||
    process.env.STOREFRONT_URL ||
    "http://localhost:8000"
  const placeholderImage = `${siteUrl}/placeholder.png`

  const labels = (fulfillment?.labels ?? []) as Array<{
    tracking_number?: string
    tracking_url?: string
  }>

  const isValidUrl = (url: unknown): url is string =>
    typeof url === "string" && /^https?:\/\//i.test(url.trim())

  const tracking_links: TrackingLink[] = labels
    .filter((l) => l.tracking_number)
    .map((l) => ({
      tracking_number: l.tracking_number as string,
      tracking_url: isValidUrl(l.tracking_url)
        ? (l.tracking_url as string).trim()
        : buildDhlTrackingUrl(l.tracking_number as string),
    }))

  const primaryTrackingNumber =
    tracking_links[0]?.tracking_number ?? ""

  const carrierLabel = inferCarrier(
    fulfillment?.provider_id,
    tracking_links[0]?.tracking_url
  )

  const items = (fulfillment?.items ?? []).map((fi: any) => {
    const lineItem = (order.items ?? []).find(
      (oi: any) => oi.id === fi.line_item_id
    )
    return {
      thumbnail: lineItem?.thumbnail || placeholderImage,
      title: lineItem?.product_title || lineItem?.title || fi.title || "Artikel",
      variant_title: lineItem?.variant_title ?? null,
      quantity: fi.quantity,
    }
  })

  const shipping = order.shipping_address ?? {}
  const orderId = order.id

  const shippedAt = fulfillment?.shipped_at ?? new Date()

  const context = {
    site_url: siteUrl,
    order_url: (data.order_url as string) || `${siteUrl}/order/${orderId}`,
    order: {
      display_id: order.display_id ?? orderId,
    },
    shipped_at_formatted: dateFormatter.format(new Date(shippedAt)),
    carrier_label: carrierLabel,
    primary_tracking_number: primaryTrackingNumber,
    tracking_links,
    items,
    shipping_address: {
      first_name: shipping.first_name ?? "",
      last_name: shipping.last_name ?? "",
      company: shipping.company ?? "",
      address_1: shipping.address_1 ?? "",
      address_2: shipping.address_2 ?? "",
      postal_code: shipping.postal_code ?? "",
      city: shipping.city ?? "",
      country_name: resolveCountryName(shipping.country_code),
    },
    company: {
      address_line: process.env.COMPANY_ADDRESS_LINE ?? "",
      city: process.env.COMPANY_CITY ?? "",
    },
  }

  return {
    subject: `Deine Bestellung #${context.order.display_id} ist unterwegs`,
    html: compiledTemplate(context),
  }
}
