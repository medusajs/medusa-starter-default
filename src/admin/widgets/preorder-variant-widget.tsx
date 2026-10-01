import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import {
  Calendar,
  EllipsisHorizontal,
  PencilSquare,
  Plus,
  Spinner,
  XCircle,
} from "@medusajs/icons"
import {
  Button,
  Container,
  DatePicker,
  Drawer,
  DropdownMenu,
  Heading,
  IconButton,
  Label,
  StatusBadge,
  Text,
  usePrompt,
} from "@medusajs/ui"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { usePreorderVariant } from "../hooks/use-preorder-variant"
import { formatDate } from "../lib/format"

const FORM_ID = "preorder-variant-form"

const startOfToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const PreorderVariantWidget = ({
  data: variant,
}: DetailWidgetProps<HttpTypes.AdminProductVariant>) => {
  const { t, i18n } = useTranslation()
  const prompt = usePrompt()
  // The variant detail route is /products/:id/variants/:variant_id.
  const { id: productIdParam } = useParams()
  const productId = productIdParam ?? variant.product_id ?? undefined

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [availableDate, setAvailableDate] = useState<Date | null>(null)

  const {
    preorderVariant,
    isLoading,
    isError,
    upsertPreorder,
    disablePreorder,
    isUpserting,
    isDisabling,
  } = usePreorderVariant(variant.id, productId)

  const isMutating = isUpserting || isDisabling
  const isDateInPast = availableDate !== null && availableDate < startOfToday()
  const canSave = availableDate !== null && !isDateInPast

  // Form state is seeded when the drawer opens, so a background refetch
  // can't overwrite edits the admin is in the middle of making.
  const openDrawer = () => {
    setAvailableDate(
      preorderVariant ? new Date(preorderVariant.available_date) : null,
    )
    setIsDrawerOpen(true)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!availableDate || isDateInPast) {
      return
    }

    upsertPreorder(
      { available_date: availableDate.toISOString() },
      { onSuccess: () => setIsDrawerOpen(false) },
    )
  }

  const handleRemove = async () => {
    const confirmed = await prompt({
      title: t("kiji.preorder.variant.removePrompt.title"),
      description: t("kiji.preorder.variant.removePrompt.description"),
      confirmText: t("kiji.preorder.variant.removePrompt.confirm"),
      cancelText: t("kiji.common.cancel"),
      variant: "danger",
    })
    if (confirmed) {
      disablePreorder()
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <Spinner className="text-ui-fg-subtle animate-spin" />
    }

    if (isError) {
      return (
        <Text size="small" leading="compact" className="text-ui-fg-error">
          {t("kiji.preorder.variant.loadError")}
        </Text>
      )
    }

    if (preorderVariant) {
      return (
        <div className="text-ui-fg-subtle flex items-center gap-x-2">
          <Calendar />
          <Text size="small" leading="compact">
            {t("kiji.preorder.availableOn", {
              date: formatDate(preorderVariant.available_date, i18n.language),
            })}
          </Text>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-y-1">
        <Text size="small" leading="compact" weight="plus">
          {t("kiji.preorder.variant.emptyTitle")}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("kiji.preorder.variant.emptyDescription")}
        </Text>
      </div>
    )
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-2">
            <Heading level="h2">{t("kiji.preorder.variant.title")}</Heading>
            {preorderVariant && (
              <StatusBadge color="green">
                {t("kiji.preorder.variant.enabled")}
              </StatusBadge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton
                size="small"
                variant="transparent"
                disabled={isLoading || isError}
              >
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                className="gap-x-2"
                disabled={isMutating}
                onClick={openDrawer}
              >
                {preorderVariant ? (
                  <PencilSquare className="text-ui-fg-subtle" />
                ) : (
                  <Plus className="text-ui-fg-subtle" />
                )}
                {preorderVariant
                  ? t("kiji.preorder.variant.actions.edit")
                  : t("kiji.preorder.variant.actions.add")}
              </DropdownMenu.Item>
              {preorderVariant && (
                <>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    className="gap-x-2"
                    disabled={isMutating}
                    onClick={handleRemove}
                  >
                    <XCircle className="text-ui-fg-subtle" />
                    {t("kiji.preorder.variant.actions.remove")}
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>

        <div className="px-6 py-4">{renderContent()}</div>
      </Container>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {preorderVariant
                ? t("kiji.preorder.variant.actions.edit")
                : t("kiji.preorder.variant.actions.add")}
            </Drawer.Title>
          </Drawer.Header>

          <Drawer.Body className="flex-1 overflow-auto p-4">
            <form
              id={FORM_ID}
              onSubmit={handleSubmit}
              className="flex flex-col gap-y-2"
            >
              <Label
                htmlFor="preorder-available-date"
                size="small"
                weight="plus"
              >
                {t("kiji.preorder.variant.form.availableDate")}
              </Label>
              <DatePicker
                id="preorder-available-date"
                value={availableDate}
                onChange={setAvailableDate}
                minValue={startOfToday()}
                isRequired
              />
              {isDateInPast ? (
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-error"
                >
                  {t("kiji.preorder.variant.form.dateInPast")}
                </Text>
              ) : (
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  {t("kiji.preorder.variant.form.availableDateHint")}
                </Text>
              )}
            </form>
          </Drawer.Body>

          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button size="small" variant="secondary" disabled={isUpserting}>
                  {t("kiji.common.cancel")}
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                type="submit"
                form={FORM_ID}
                disabled={!canSave}
                isLoading={isUpserting}
              >
                {t("kiji.common.save")}
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.side.after",
})

export default PreorderVariantWidget
