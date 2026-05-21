import fs from "node:fs"
import path from "node:path"
import Handlebars from "handlebars"
import { BigNumberValue, OrderDTO } from "@medusajs/framework/types"

const templateSource = fs.readFileSync(
  path.join(__dirname, "order-placed.html"),
  "utf-8"
)
const compiledTemplate = Handlebars.compile(templateSource, { noEscape: false })

const PAYMENT_LABELS: Record<string, string> = {
  pp_stripe_stripe: "Kreditkarte (Stripe)",
  pp_system_default: "Rechnung",
  manual: "Rechnung / Vorkasse",
}

const countryDisplay = new Intl.DisplayNames(["de"], { type: "region" })

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === "object") {
    const obj = value as any
    // Medusa BigNumber class instance
    if (typeof obj.numeric === "number") return obj.numeric
    // BigNumber.raw or plain { value: "X.XX", precision: 20 }
    const raw = obj.raw ?? obj
    if (raw && (typeof raw.value === "string" || typeof raw.value === "number")) {
      const parsed = parseFloat(String(raw.value))
      if (!Number.isNaN(parsed)) return parsed
    }
    // Fallback: valueOf (BigNumber implements it)
    if (typeof obj.valueOf === "function") {
      const v = obj.valueOf()
      if (typeof v === "number" && Number.isFinite(v)) return v
      if (typeof v === "string") {
        const parsed = parseFloat(v)
        if (!Number.isNaN(parsed)) return parsed
      }
    }
  }
  const parsed = parseFloat(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

const formatPrice = (value: BigNumberValue | number, currencyCode: string): string =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(toNumber(value))

const resolveCountryName = (countryCode?: string | null): string => {
  if (!countryCode) return ""
  try {
    return countryDisplay.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase()
  } catch {
    return countryCode.toUpperCase()
  }
}

const resolvePaymentLabel = (order: OrderDTO): string => {
  const collections = (order as any).payment_collections ?? []
  for (const collection of collections) {
    for (const payment of collection.payments ?? []) {
      const providerId: string | undefined = payment.provider_id
      if (!providerId) continue
      if (PAYMENT_LABELS[providerId]) return PAYMENT_LABELS[providerId]
      if (providerId.includes("stripe")) return "Kreditkarte (Stripe)"
      return providerId.replace(/^pp_/, "").replace(/_/g, " ")
    }
  }
  return "—"
}

type DiscountLine = { code: string; amount: number }

const aggregateDiscounts = (order: OrderDTO): DiscountLine[] => {
  const map = new Map<string, DiscountLine>()

  const addAdjustment = (adj: any) => {
    const key = adj.promotion_id ?? adj.code ?? "manual"
    const code = adj.code ?? ""
    const amount = Math.abs(toNumber(adj.amount))
    if (amount === 0) return
    const current = map.get(key) ?? { code, amount: 0 }
    current.amount += amount
    map.set(key, current)
  }

  for (const item of order.items ?? []) {
    for (const adj of (item as any).adjustments ?? []) addAdjustment(adj)
  }
  for (const sm of (order as any).shipping_methods ?? []) {
    for (const adj of sm.adjustments ?? []) addAdjustment(adj)
  }

  return Array.from(map.values())
}

type EmailContext = {
  site_url: string
  order_url: string
  customer: { first_name: string }
  has_preorder_items: boolean
  order: {
    display_id: string | number
    created_at_formatted: string
    items: Array<{
      thumbnail: string
      title: string
      variant_title: string | null
      quantity: number
      unit_price_formatted: string
      line_total_formatted: string
      is_preorder: boolean
      available_date_formatted: string | null
    }>
    original_item_total_formatted: string
    discount_total_raw: number
    discount_lines: Array<{ code: string; amount_formatted: string }>
    shipping_total_formatted: string
    shipping_method_name: string | null
    tax_total_formatted: string
    total_formatted: string
  }
  shipping_address: {
    first_name: string
    last_name: string
    company: string
    address_1: string
    address_2: string
    postal_code: string
    city: string
    country_name: string
  }
  payment_method_label: string
  company: { address_line: string; city: string }
}

const buildContext = (data: Record<string, unknown>): EmailContext => {
  const order = data.order as OrderDTO & {
    customer?: { first_name?: string | null }
    shipping_address?: any
    shipping_methods?: any[]
  }
  const siteUrl =
    (data.site_url as string) ||
    process.env.STOREFRONT_URL ||
    "http://localhost:8000"
  const placeholderImage = `${siteUrl}/placeholder.png`
  const currency = order.currency_code ?? "eur"
  const fmt = (v: BigNumberValue | number | undefined) =>
    formatPrice(v ?? 0, currency)

  const firstName =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    "Kunde"

  const items = (order.items ?? []).map((item: any) => {
    const preorderVariant = item.variant?.preorder_variant
    const isPreorder =
      !!preorderVariant?.id && preorderVariant.status !== "disabled"
    const availableDate = preorderVariant?.available_date
      ? dateFormatter.format(new Date(preorderVariant.available_date))
      : null
    return {
      thumbnail: item.thumbnail || placeholderImage,
      title: item.product_title || item.title || "Artikel",
      variant_title: item.variant_title ?? null,
      quantity: item.quantity,
      unit_price_formatted: fmt(item.unit_price),
      line_total_formatted: fmt(item.total),
      is_preorder: isPreorder,
      available_date_formatted: availableDate,
    }
  })

  const hasPreorderItems = items.some((i) => i.is_preorder)

  const discounts = aggregateDiscounts(order)
  const discountTotalRaw = discounts.reduce((sum, d) => sum + d.amount, 0)
  const discountLines = discounts.map((d) => ({
    code: d.code,
    amount_formatted: fmt(d.amount),
  }))

  const shippingMethodName =
    (order as any).shipping_methods?.[0]?.name ?? null

  const shipping = order.shipping_address ?? {}
  const orderId = order.id

  return {
    site_url: siteUrl,
    order_url: (data.order_url as string) || `${siteUrl}/order/${orderId}`,
    customer: { first_name: firstName },
    has_preorder_items: hasPreorderItems,
    order: {
      display_id: order.display_id ?? orderId,
      created_at_formatted: order.created_at
        ? dateFormatter.format(new Date(order.created_at as any))
        : "",
      items,
      original_item_total_formatted: fmt((order as any).original_item_total),
      discount_total_raw: discountTotalRaw,
      discount_lines: discountLines,
      shipping_total_formatted: fmt(order.shipping_total),
      shipping_method_name: shippingMethodName,
      tax_total_formatted: fmt(order.tax_total),
      total_formatted: fmt(order.total),
    },
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
    payment_method_label: resolvePaymentLabel(order),
    company: {
      address_line: process.env.COMPANY_ADDRESS_LINE ?? "",
      city: process.env.COMPANY_CITY ?? "",
    },
  }
}

export const renderOrderPlacedEmail = (
  data: Record<string, unknown>
): { subject: string; html: string } => {
  const context = buildContext(data)
  return {
    subject: `Bestellung #${context.order.display_id} bestätigt`,
    html: compiledTemplate(context),
  }
}
