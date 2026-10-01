import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { useOrderPreorders } from "../hooks/use-order-preorders"
import { formatDate } from "../lib/format"
import type { PreorderStatus } from "../lib/types"

const STATUS_BADGE_COLOR: Record<PreorderStatus, "green" | "orange" | "grey"> =
  {
    pending: "orange",
    fulfilled: "green",
    cancelled: "grey",
  }

const OrderPreordersWidget = ({
  data: order,
}: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const { t, i18n } = useTranslation()
  const { preorders, isLoading, isError } = useOrderPreorders(order.id)

  // Most orders have no pre-orders: render nothing until we know there are
  // some, so the sidebar doesn't jump from a loading card to nothing.
  if (isLoading || (!isError && !preorders.length)) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading level="h2">{t("kiji.preorder.order.title")}</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("kiji.preorder.order.description")}
        </Text>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        {isError ? (
          <Text size="small" leading="compact" className="text-ui-fg-error">
            {t("kiji.preorder.order.loadError")}
          </Text>
        ) : (
          preorders.map((preorder) => {
            const variant = preorder.item.product_variant
            const title =
              variant?.title || t("kiji.preorder.order.unnamedVariant")
            const thumbnail = variant?.product?.thumbnail
            const productId = variant?.product_id

            return (
              <div key={preorder.id} className="flex items-center gap-x-3">
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt={title}
                    className="border-ui-border-base h-16 w-16 shrink-0 rounded-md border object-cover"
                  />
                )}
                <div className="flex min-w-0 flex-col gap-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text size="small" leading="compact" weight="plus">
                      {title}
                    </Text>
                    <StatusBadge color={STATUS_BADGE_COLOR[preorder.status]}>
                      {t(`kiji.preorder.status.${preorder.status}`)}
                    </StatusBadge>
                  </div>
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    {t("kiji.preorder.availableOn", {
                      date: formatDate(
                        preorder.item.available_date,
                        i18n.language,
                      ),
                    })}
                  </Text>
                  {productId && (
                    <Link
                      to={`/products/${productId}/variants/${preorder.item.variant_id}`}
                      className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover w-fit"
                    >
                      {t("kiji.preorder.order.viewVariant")}
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderPreordersWidget
