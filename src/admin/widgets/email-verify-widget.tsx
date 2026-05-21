import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type CustomerWithMetadata = HttpTypes.AdminCustomer & {
  metadata?: Record<string, unknown> | null
}

const EmailVerifyWidget = ({
  data: customer,
}: DetailWidgetProps<HttpTypes.AdminCustomer>) => {
  const c = customer as CustomerWithMetadata
  const queryClient = useQueryClient()

  // Account-less guest customers don't have a login, so the verify gate
  // doesn't apply to them — hide the widget entirely.
  if (!c.has_account) return <></>

  const verified = c.metadata?.email_verified === true

  const setVerified = useMutation({
    mutationFn: (next: boolean) =>
      sdk.client.fetch(`/admin/customers/${c.id}/email-verified`, {
        method: "POST",
        body: { verified: next },
      }),
    onSuccess: (_, next) => {
      toast.success(
        next
          ? "E-Mail-Adresse als verifiziert markiert."
          : "Verifikation entfernt.",
      )
      // Force the customer-detail query to refetch so the metadata reflects
      // the new state without a manual reload.
      queryClient.invalidateQueries({ queryKey: ["customer", c.id] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err) => {
      toast.error(
        `Aktion fehlgeschlagen: ${err instanceof Error ? err.message : "unbekannter Fehler"}`,
      )
    },
  })

  const resendMail = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/customers/${c.id}/resend-verification`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Bestätigungsmail verschickt.")
    },
    onError: (err) => {
      toast.error(
        `Mail konnte nicht gesendet werden: ${err instanceof Error ? err.message : "unbekannter Fehler"}`,
      )
    },
  })

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">E-Mail-Verifizierung</Heading>
          <StatusBadge color={verified ? "green" : "orange"}>
            {verified ? "Verifiziert" : "Nicht verifiziert"}
          </StatusBadge>
        </div>

        <Text size="small" className="text-ui-fg-muted">
          {verified
            ? "Der Kunde hat seine E-Mail-Adresse bestätigt und kann den Checkout durchlaufen."
            : "Der Kunde kann den Checkout nicht abschließen, bis die E-Mail bestätigt ist."}
        </Text>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          {verified ? (
            <Button
              variant="secondary"
              size="small"
              isLoading={setVerified.isPending}
              onClick={() => setVerified.mutate(false)}
            >
              Verifikation entfernen
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="small"
                isLoading={setVerified.isPending}
                onClick={() => setVerified.mutate(true)}
              >
                Als verifiziert markieren
              </Button>
              <Button
                variant="secondary"
                size="small"
                isLoading={resendMail.isPending}
                onClick={() => resendMail.mutate()}
              >
                Bestätigungsmail erneut senden
              </Button>
            </>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.after",
})

export default EmailVerifyWidget
