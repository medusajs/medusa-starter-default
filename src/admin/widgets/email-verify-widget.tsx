import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  usePrompt,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useEmailVerification } from "../hooks/use-email-verification"

const EmailVerifyWidget = ({
  data: customer,
}: DetailWidgetProps<HttpTypes.AdminCustomer>) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const {
    setVerified,
    resendVerification,
    isSettingVerified,
    isResending,
  } = useEmailVerification(customer.id)

  // Account-less guest customers don't have a login, so the verify gate
  // doesn't apply to them — hide the widget entirely.
  if (!customer.has_account) {
    return null
  }

  const verified = customer.metadata?.email_verified === true
  const isPending = isSettingVerified || isResending

  const handleRemoveVerification = async () => {
    const confirmed = await prompt({
      title: t("kiji.emailVerify.removePrompt.title"),
      description: t("kiji.emailVerify.removePrompt.description"),
      confirmText: t("kiji.emailVerify.removePrompt.confirm"),
      cancelText: t("kiji.common.cancel"),
      variant: "danger",
    })
    if (confirmed) {
      setVerified(false)
    }
  }

  return (
    <Container className="flex flex-col gap-y-3 px-6 py-4">
      <div className="flex items-center justify-between gap-x-2">
        <Heading level="h2">{t("kiji.emailVerify.title")}</Heading>
        <StatusBadge color={verified ? "green" : "orange"}>
          {verified
            ? t("kiji.emailVerify.status.verified")
            : t("kiji.emailVerify.status.unverified")}
        </StatusBadge>
      </div>

      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {verified
          ? t("kiji.emailVerify.description.verified")
          : t("kiji.emailVerify.description.unverified")}
      </Text>

      <div className="flex flex-wrap gap-2">
        {verified ? (
          <Button
            variant="secondary"
            size="small"
            disabled={isPending}
            isLoading={isSettingVerified}
            onClick={handleRemoveVerification}
          >
            {t("kiji.emailVerify.actions.removeVerification")}
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="small"
              disabled={isPending}
              isLoading={isSettingVerified}
              onClick={() => setVerified(true)}
            >
              {t("kiji.emailVerify.actions.markVerified")}
            </Button>
            <Button
              variant="secondary"
              size="small"
              disabled={isPending}
              isLoading={isResending}
              onClick={() => resendVerification()}
            >
              {t("kiji.emailVerify.actions.resend")}
            </Button>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.after",
})

export default EmailVerifyWidget
