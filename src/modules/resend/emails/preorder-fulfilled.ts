import fs from "node:fs"
import path from "node:path"
import Handlebars from "handlebars"

const templateSource = fs.readFileSync(
  path.join(__dirname, "preorder-fulfilled.html"),
  "utf-8"
)
const compiledTemplate = Handlebars.compile(templateSource)

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export const renderPreorderFulfilledEmail = (
  data: Record<string, unknown>
): { subject: string; html: string } => {
  const order = data.order as any
  const fulfilledItems = (data.fulfilled_items as any[]) ?? []
  const siteUrl =
    (data.site_url as string) ||
    process.env.STOREFRONT_URL ||
    "http://localhost:8000"
  const placeholderImage = `${siteUrl}/placeholder.png`

  const items = fulfilledItems.map((item: any) => ({
    thumbnail: item.thumbnail || placeholderImage,
    title: item.product_title || item.title || "Artikel",
    variant_title: item.variant_title ?? null,
    quantity: item.quantity,
  }))

  const orderId = order.id

  const context = {
    site_url: siteUrl,
    order_url: (data.order_url as string) || `${siteUrl}/order/${orderId}`,
    order: { display_id: order.display_id ?? orderId },
    fulfilled_at_formatted: dateFormatter.format(new Date()),
    items,
    company: {
      address_line: process.env.COMPANY_ADDRESS_LINE ?? "",
      city: process.env.COMPANY_CITY ?? "",
    },
  }

  return {
    subject: `Deine Vorbestellung zu #${context.order.display_id} ist verfügbar`,
    html: compiledTemplate(context),
  }
}
