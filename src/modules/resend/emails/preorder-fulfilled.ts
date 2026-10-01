import {
  companyBlock,
  formatDate,
  itemTitle,
  orderUrl,
  placeholderImage,
  renderTemplate,
  siteUrl,
  type MailLineItem,
  type RenderedEmail,
} from "./_shared"
import template from "./templates/preorder-fulfilled"

type PreorderFulfilledOrder = {
  id: string
  display_id?: number | string | null
}

export const renderPreorderFulfilledEmail = (
  data: Record<string, unknown>,
): RenderedEmail => {
  const order = data.order as PreorderFulfilledOrder
  const fulfilledItems = (data.fulfilled_items as MailLineItem[] | undefined) ?? []
  const site = siteUrl(data)
  const placeholder = placeholderImage(site)
  const displayId = order.display_id ?? order.id

  return {
    subject: `Deine Vorbestellung zu #${displayId} ist verfügbar`,
    html: renderTemplate("preorder-fulfilled", template, {
      site_url: site,
      order_url: orderUrl(data, order.id),
      order: { display_id: displayId },
      fulfilled_at_formatted: formatDate(new Date()),
      items: fulfilledItems.map((item) => ({
        thumbnail: item.thumbnail || placeholder,
        title: itemTitle(item),
        variant_title: item.variant_title ?? null,
        quantity: item.quantity,
      })),
      company: companyBlock(),
    }),
  }
}
