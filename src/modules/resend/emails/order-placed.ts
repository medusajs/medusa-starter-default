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
import template from "./templates/order-placed"

const PAYMENT_LABELS: Record<string, string> = {
  pp_stripe_stripe: "Kreditkarte (Stripe)",
  pp_system_default: "Rechnung",
  manual: "Rechnung / Vorkasse",
}

type Adjustment = {
  promotion_id?: string | null
  code?: string | null
  amount?: unknown
}

type OrderItem = MailLineItem & {
  unit_price?: unknown
  total?: unknown
  adjustments?: Adjustment[] | null
  variant?: {
    preorder_variant?: {
      id?: string | null
      status?: string | null
      available_date?: string | Date | null
    } | null
  } | null
}

type PlacedOrder = {
  id: string
  display_id?: number | string | null
  currency_code?: string | null
  created_at?: string | Date | null
  total?: unknown
  tax_total?: unknown
  discount_total?: unknown
  shipping_total?: unknown
  original_item_total?: unknown
  items?: OrderItem[] | null
  shipping_methods?: Array<{ name?: string | null; adjustments?: Adjustment[] | null }> | null
  shipping_address?: AddressInput & { first_name?: string | null }
  customer?: { first_name?: string | null } | null
  payment_collections?: Array<{
    payments?: Array<{ provider_id?: string | null }> | null
  }> | null
}

// Order amounts arrive as numbers, numeric strings, BigNumber instances or
// serialized BigNumber objects ({ value, precision } / { raw: { value } }).
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === "object") {
    const obj = value as {
      numeric?: unknown
      raw?: { value?: unknown }
      value?: unknown
      valueOf?: () => unknown
    }
    if (typeof obj.numeric === "number") return obj.numeric
    const raw = (obj.raw ?? obj) as { value?: unknown }
    if (typeof raw.value === "string" || typeof raw.value === "number") {
      const parsed = parseFloat(String(raw.value))
      if (!Number.isNaN(parsed)) return parsed
    }
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

const formatPrice = (value: unknown, currencyCode: string): string =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(toNumber(value))

const resolvePaymentLabel = (order: PlacedOrder): string => {
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      const providerId = payment.provider_id
      if (!providerId) continue
      if (PAYMENT_LABELS[providerId]) return PAYMENT_LABELS[providerId]
      if (providerId.includes("stripe")) return "Kreditkarte (Stripe)"
      return providerId.replace(/^pp_/, "").replace(/_/g, " ")
    }
  }
  return "—"
}

type DiscountLine = { code: string; amount: number }

const aggregateDiscounts = (order: PlacedOrder): DiscountLine[] => {
  const map = new Map<string, DiscountLine>()

  const addAdjustment = (adj: Adjustment) => {
    const key = adj.promotion_id ?? adj.code ?? "manual"
    const amount = Math.abs(toNumber(adj.amount))
    if (amount === 0) return
    const current = map.get(key) ?? { code: adj.code ?? "", amount: 0 }
    current.amount += amount
    map.set(key, current)
  }

  for (const item of order.items ?? []) {
    for (const adj of item.adjustments ?? []) addAdjustment(adj)
  }
  for (const sm of order.shipping_methods ?? []) {
    for (const adj of sm.adjustments ?? []) addAdjustment(adj)
  }

  return Array.from(map.values())
}

const buildContext = (data: Record<string, unknown>) => {
  const order = data.order as PlacedOrder
  const site = siteUrl(data)
  const placeholder = placeholderImage(site)
  const currency = order.currency_code ?? "eur"
  const fmt = (v: unknown) => formatPrice(v ?? 0, currency)

  const firstName =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    "Kunde"

  const items = (order.items ?? []).map((item) => {
    const preorderVariant = item.variant?.preorder_variant
    const isPreorder =
      !!preorderVariant?.id && preorderVariant.status !== "disabled"
    return {
      thumbnail: item.thumbnail || placeholder,
      title: itemTitle(item),
      variant_title: item.variant_title ?? null,
      quantity: item.quantity,
      unit_price_formatted: fmt(item.unit_price),
      line_total_formatted: fmt(item.total),
      is_preorder: isPreorder,
      available_date_formatted: formatDate(preorderVariant?.available_date) || null,
    }
  })

  const discounts = aggregateDiscounts(order)
  // Adjustments are stored net (is_tax_inclusive=false), but the email renders
  // gross subtotal and total. Scale the per-code net amounts up to the gross
  // discount_total so the rows reconcile (206,33 − 6,00 = 200,33), matching the
  // storefront's cost-breakdown.ts. Without this the discount showed e.g. 5,61
  // net against gross totals and the lines didn't sum to the total.
  const rawDiscountTotal = discounts.reduce((sum, d) => sum + d.amount, 0)
  const grossDiscountTotal = Math.abs(toNumber(order.discount_total))
  const discountScale =
    rawDiscountTotal > 0 &&
    grossDiscountTotal > 0 &&
    Math.abs(rawDiscountTotal - grossDiscountTotal) > 0.005
      ? grossDiscountTotal / rawDiscountTotal
      : 1

  return {
    site_url: site,
    order_url: orderUrl(data, order.id),
    customer: { first_name: firstName },
    has_preorder_items: items.some((i) => i.is_preorder),
    order: {
      display_id: order.display_id ?? order.id,
      created_at_formatted: formatDate(order.created_at),
      items,
      original_item_total_formatted: fmt(order.original_item_total),
      discount_total_raw:
        grossDiscountTotal > 0 ? grossDiscountTotal : rawDiscountTotal,
      discount_lines: discounts.map((d) => ({
        code: d.code,
        amount_formatted: fmt(d.amount * discountScale),
      })),
      shipping_total_formatted: fmt(order.shipping_total),
      shipping_method_name: order.shipping_methods?.[0]?.name ?? null,
      tax_total_formatted: fmt(order.tax_total),
      total_formatted: fmt(order.total),
    },
    shipping_address: addressBlock(order.shipping_address),
    payment_method_label: resolvePaymentLabel(order),
    company: companyBlock(),
  }
}

export const renderOrderPlacedEmail = (
  data: Record<string, unknown>,
): RenderedEmail => {
  const context = buildContext(data)
  return {
    subject: `Bestellung #${context.order.display_id} bestätigt`,
    html: renderTemplate("order-placed", template, context),
  }
}
