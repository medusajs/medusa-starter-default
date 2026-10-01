import {
  addressBlock,
  companyBlock,
  formatDate,
  itemTitle,
  orderUrl,
  placeholderImage,
  renderTemplate,
  siteUrl,
  type AddressInput,
  type MailLineItem,
  type RenderedEmail,
} from "./_shared"
import template from "./templates/shipment-created"

type ShipmentFulfillment = {
  provider_id?: string | null
  shipped_at?: string | Date | null
  labels?: Array<{ tracking_number?: string | null; tracking_url?: string | null }> | null
  items?: Array<{ line_item_id?: string | null; title?: string | null; quantity?: number | null }> | null
}

type ShipmentOrder = {
  id: string
  display_id?: number | string | null
  items?: MailLineItem[] | null
  shipping_address?: AddressInput
}

const buildDhlTrackingUrl = (trackingNumber: string): string =>
  `https://nolp.dhl.de/nextt-online-public/set_identcodes.do?lang=de&idc=${encodeURIComponent(
    trackingNumber,
  )}`

const inferCarrier = (
  providerId: string | null | undefined,
  trackingUrl: string | undefined,
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

// Only http(s) links end up in an href; anything else falls back to DHL.
const isHttpUrl = (url: unknown): url is string =>
  typeof url === "string" && /^https?:\/\//i.test(url.trim())

export const renderShipmentCreatedEmail = (
  data: Record<string, unknown>,
): RenderedEmail => {
  const fulfillment = (data.fulfillment as ShipmentFulfillment | undefined) ?? {}
  const order = data.order as ShipmentOrder
  const site = siteUrl(data)
  const placeholder = placeholderImage(site)

  const trackingLinks = (fulfillment.labels ?? [])
    .filter((l): l is { tracking_number: string; tracking_url?: string | null } =>
      !!l.tracking_number,
    )
    .map((l) => ({
      tracking_number: l.tracking_number,
      tracking_url: isHttpUrl(l.tracking_url)
        ? l.tracking_url.trim()
        : buildDhlTrackingUrl(l.tracking_number),
    }))

  const orderItems = order.items ?? []
  const items = (fulfillment.items ?? []).map((fi) => {
    const lineItem = orderItems.find((oi) => oi.id === fi.line_item_id)
    return {
      thumbnail: lineItem?.thumbnail || placeholder,
      title: itemTitle(lineItem, fi.title),
      variant_title: lineItem?.variant_title ?? null,
      quantity: fi.quantity,
    }
  })

  const displayId = order.display_id ?? order.id

  return {
    subject: `Deine Bestellung #${displayId} ist unterwegs`,
    html: renderTemplate("shipment-created", template, {
      site_url: site,
      order_url: orderUrl(data, order.id),
      order: { display_id: displayId },
      shipped_at_formatted: formatDate(fulfillment.shipped_at ?? new Date()),
      carrier_label: inferCarrier(fulfillment.provider_id, trackingLinks[0]?.tracking_url),
      primary_tracking_number: trackingLinks[0]?.tracking_number ?? "",
      tracking_links: trackingLinks,
      items,
      shipping_address: addressBlock(order.shipping_address),
      company: companyBlock(),
    }),
  }
}
